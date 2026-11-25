const initialDepartments = ['Nhân sự','Kế toán','EHS','IT','Sản xuất','Logistics','OE','TPM']
const types = ['Màn hình','PC','Laptop','Scanner','Máy in','Server','Switch','Firewall']
const stockStates = ['ready','stored','damaged','destroyed']
const available = ['ready','stored']
const sessionLength = 12 * 60 * 60
const encoder = new TextEncoder()

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function must(valid, message, status = 400) {
  if (!valid) throw new HttpError(status, message)
}

function respond(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } })
}

function str(value, label, max = 120, required = false) {
  const clean = typeof value === 'string' ? value.trim() : ''
  must(clean.length <= max && (!required || clean), label + ' không hợp lệ.')
  return clean
}

function select(value, choices, label) {
  must(choices.includes(value), label + ' không hợp lệ.')
  return value
}

function date(value, label, optional = false) {
  if (optional && !value) return ''
  const parsed = new Date(value)
  const valid = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  must(valid, label + ' không hợp lệ.')
  return value
}

const now = () => new Date().toISOString()
const localDate = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0,10)
const seconds = () => Math.floor(Date.now() / 1000)
const uid = () => crypto.randomUUID()
const hex = bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('')
const digest = async text => hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)))
const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args)
const rows = async query => (await query.all()).results

async function audited(db, space, user, mode, operations) {
  const results = await db.batch([
    stmt(db,'INSERT INTO audit_context(space,actor,mode) VALUES (?,?,?)',space,user.name,mode),
    ...operations,
    stmt(db,'DELETE FROM audit_context WHERE space=?',space),
  ])
  return results.slice(1,-1)
}

const normalizedName = value => value.normalize('NFC').replace(/\s+/gu,' ')
const departmentKey = name => normalizedName(name).toLocaleLowerCase('vi-VN')

async function ensureDepartments(db, space) {
  const marker = 'departments:' + space
  if (await stmt(db,'SELECT 1 FROM spaces_seeded WHERE space=?',marker).first()) return
  const existing = await rows(stmt(db,`SELECT department FROM people WHERE space=? AND department<>''
    UNION SELECT department FROM devices WHERE space=? AND department<>'' AND deleted=0`,space,space))
  const names = [...initialDepartments,...existing.map(record=>record.department)].map(name=>[name,departmentKey(name)])
  await db.batch([
    stmt(db,`INSERT OR IGNORE INTO departments(space,id,name,name_key,updated)
      SELECT ?,lower(hex(randomblob(16))),value->>0,value->>1,? FROM json_each(?)
      WHERE NOT EXISTS(SELECT 1 FROM spaces_seeded WHERE space=?)`,space,now(),JSON.stringify(names),marker),
    stmt(db,'INSERT OR IGNORE INTO spaces_seeded VALUES (?)',marker),
  ])
}

async function departmentName(db, space, value, optional = false) {
  const name = str(value,'Phòng ban',100,!optional)
  if (!name) return ''
  const record = await stmt(db,'SELECT name FROM departments WHERE space=? AND name_key=?',space,departmentKey(name)).first()
  must(record,'Phòng ban “' + name + '” không còn tồn tại. Hãy chọn lại phòng ban.',409)
  return record.name
}

function same(a, b) {
  if (a.length !== b.length) return false
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return difference === 0
}

async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:encoder.encode(salt), iterations:100000 }, key, 256))
}

async function passwordHash(password) {
  const salt = uid()
  return salt + '.' + await derive(password, salt)
}

async function passwordMatches(password, hash) {
  const [salt, stored] = hash.split('.')
  return same(stored, await derive(password, salt))
}

function sessionCookie(url, value, age) {
  return 'draexl_session=' + value + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + age + (url.protocol === 'https:' ? '; Secure' : '')
}

function sessionToken(request) {
  const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)draexl_session=([0-9a-f]{64})(?:;|$)/)
  return token?.[1]
}

async function authenticate(request, db) {
  const token = sessionToken(request)
  if (!token) return null
  const record = await stmt(db, `SELECT s.username,a.name,a.role,a.active
    FROM sessions s LEFT JOIN accounts a ON a.username=s.username
    WHERE s.token=? AND s.expires>?`, await digest(token), seconds()).first()
  if (!record || (!record.active && (record.username !== 'admin' || record.role))) return null
  return { username:record.username, name:record.name || 'Quản trị IT', role:record.role || 'it' }
}

async function login(db, env, request, body, url) {
  const username = str(body.username, 'Tên đăng nhập', 48, true).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  must(password.length > 0 && password.length <= 200, 'Tên đăng nhập hoặc mật khẩu không đúng.', 401)
  const bucket = await digest(request.headers.get('CF-Connecting-IP') || 'local')
  const timestamp = seconds()
  const [rate] = await db.batch([
    stmt(db, `INSERT INTO login_limits (bucket,expires,attempts) VALUES (?,?,1)
      ON CONFLICT(bucket) DO UPDATE SET
      attempts=CASE WHEN expires<=? THEN 1 ELSE attempts+1 END,
      expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING attempts`,
      bucket, timestamp + 600, timestamp, timestamp),
    stmt(db, 'DELETE FROM login_limits WHERE expires<=?', timestamp),
  ])
  must(rate.results[0].attempts <= 20, 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 10 phút.', 429)
  const account = await stmt(db, 'SELECT * FROM accounts WHERE username=?', username).first()
  let valid = false
  if (account?.active) valid = await passwordMatches(password, account.password_hash)
  if (!account && username === 'admin' && env.ADMIN_PASSWORD) {
    valid = same(await digest(password), await digest(env.ADMIN_PASSWORD))
  }
  must(valid, 'Tên đăng nhập hoặc mật khẩu không đúng.', 401)
  const token = hex(crypto.getRandomValues(new Uint8Array(32)))
  const operations = await db.batch([
    stmt(db, 'DELETE FROM sessions WHERE expires<=?', timestamp),
    stmt(db, 'DELETE FROM login_limits WHERE bucket=?', bucket),
    stmt(db, `INSERT INTO sessions SELECT ?,?,? WHERE
      (? IS NULL AND NOT EXISTS (SELECT 1 FROM accounts WHERE username=?))
      OR EXISTS (SELECT 1 FROM accounts WHERE username=? AND active=1 AND password_hash=?)`,
      await digest(token),username,timestamp + sessionLength,account?.password_hash || null,
      username,username,account?.password_hash || null),
  ])
  must(operations[2].meta.changes > 0,'Thông tin đăng nhập đã thay đổi. Vui lòng thử lại.',401)
  return respond({ username, name:account?.name || 'Quản trị IT', role:account?.role || 'it' }, 200,
    { 'Set-Cookie': sessionCookie(url, token, sessionLength) })
}

const examples = [
  ['Laptop','Dell Latitude 5440','IT','assigned','An','Tòa A · Tầng 2'],
  ['Màn hình','Dell UltraSharp U2422H','Kế toán','assigned','','Tòa A · Tầng 1'],
  ['Máy in','HP LaserJet Pro M404dn','Nhân sự','ready','','Kho IT · Kệ A2'],
  ['Switch','Cisco Catalyst C9200','IT','assigned','','Phòng Server'],
  ['Scanner','Zebra DS2208','Logistics','damaged','','Kho IT · Kệ B1'],
  ['PC','HP ProDesk 400 G7','Sản xuất','stored','','Kho IT · Kệ A1'],
  ['Laptop','Lenovo ThinkPad T14','OE','assigned','Minh','Tòa B · Tầng 1'],
  ['Firewall','Fortinet FortiGate 100F','IT','assigned','','Phòng Server'],
  ['Server','Dell PowerEdge R550','IT','assigned','','Phòng Server'],
  ['Màn hình','HP E24 G5','EHS','assigned','Linh','Tòa A · Tầng 1'],
  ['PC','Dell OptiPlex 7010','TPM','ready','','Kho IT · Kệ A1'],
  ['Máy in','Brother HL-L2366DW','Logistics','destroyed','',''],
]

const samplePeople = [
  ['An','Nguyễn Hoài An','1995-05-16','IT Support','IT'],
  ['Linh','Trần Thùy Linh','1998-03-21','Chuyên viên an toàn','EHS'],
  ['Minh','Lê Đức Minh','1994-11-10','Kỹ sư quy trình','OE'],
  ['Hà','Võ Thu Hà','1997-07-18','Chuyên viên tuyển dụng','Nhân sự'],
  ['Nam','Phạm Hoàng Nam','1993-08-08','Điều phối kho','Logistics'],
]

async function seedDemo(db) {
  if (await stmt(db, "SELECT 1 FROM spaces_seeded WHERE space='demo'").first()) return
  const sampleRows = examples.map(([type,name,department,status,person,location], i) => ({
    id:'sample-' + (i+1), code:'DX-' + String(i+1).padStart(4,'0'), type, name, department,
    status, person, location, serial:'SN' + (582148 + i * 9471),
  }))
  await db.batch([
    stmt(db, `INSERT OR IGNORE INTO people(space,id,name,dob,position,department)
      SELECT 'demo',value->>0,value->>1,value->>2,value->>3,value->>4 FROM json_each(?)`, JSON.stringify(samplePeople)),
    stmt(db, `INSERT OR IGNORE INTO devices(space,id,code,type,name,department,status,person_id,location,serial,updated)
      SELECT 'demo',value->>'id',value->>'code',value->>'type',value->>'name',value->>'department',
      value->>'status',value->>'person',value->>'location',value->>'serial',?
      FROM json_each(?)`, '2026-11-23T02:00:00.000Z', JSON.stringify(sampleRows)),
    stmt(db, `WITH RECURSIVE numbers(n) AS (VALUES(13) UNION ALL SELECT n+1 FROM numbers WHERE n<1000)
      INSERT OR IGNORE INTO devices(space,id,code,name,type,serial,status,department,location,updated)
      SELECT 'demo','sample-'||n,printf('DX-%04d',n),
      json_extract(?, '$['||(n%12)||'].name'),json_extract(?, '$['||(n%12)||'].type'),
      printf('SN%06d',764000+n),
      CASE WHEN n<=730 THEN 'assigned' WHEN n<=871 THEN 'ready' WHEN n<=953 THEN 'stored'
        WHEN n<=990 THEN 'damaged' ELSE 'destroyed' END,
      CASE WHEN n<=730 THEN json_extract(?, '$['||(n%8)||']') ELSE '' END,
      CASE WHEN n<=730 THEN 'DRÄXLMAIER Việt Nam' ELSE 'Kho IT' END,
      '2026-11-20T02:00:00.000Z' FROM numbers`,
      JSON.stringify(sampleRows), JSON.stringify(sampleRows), JSON.stringify(initialDepartments)),
    stmt(db, "INSERT OR IGNORE INTO spaces_seeded VALUES ('demo')"),
  ])
}

async function inventory(db, space, user) {
  const peopleFields = user.role === 'it' ? '*' : 'id,name,position,department,active'
  const queries = [
    stmt(db, 'SELECT * FROM devices WHERE space=? AND deleted=0 ORDER BY code', space),
    stmt(db, 'SELECT ' + peopleFields + ' FROM people WHERE space=? ORDER BY name', space),
    stmt(db, 'SELECT * FROM slips WHERE space=? ORDER BY created DESC', space),
    stmt(db, 'SELECT id,name,description,rev FROM departments WHERE space=? ORDER BY name', space),
  ]
  const [devices, people, slips, departments] = await db.batch(queries)
  return { devices:devices.results, people:people.results, departments:departments.results,
    slips:slips.results.map(s => ({...s, items:JSON.parse(s.items)})) }
}

async function personFields(db, space, body) {
  const dob = date(body.dob, 'Ngày sinh', true)
  if (dob) must(dob <= localDate(), 'Ngày sinh không thể ở tương lai.')
  return [str(body.name,'Họ và tên',120,true), dob,
    str(body.position,'Chức danh'),await departmentName(db,space,body.department,true)]
}

function conflict(result) {
  must(result.meta.changes > 0, 'Dữ liệu đã thay đổi. Hãy tải lại và thử lại.', 409)
}

function revision(value) {
  const rev = Number(value)
  must(Number.isSafeInteger(rev) && rev>0,'Thiếu phiên bản hồ sơ. Hãy tải lại rồi thử lại.',409)
  return rev
}

async function savePerson(db, space, user, body) {
  const id = str(body.id, 'Nhân viên', 60)
  if (!id) {
    const assets = body.assetIds ?? []
    must(Array.isArray(assets),'Danh sách thiết bị không hợp lệ.')
    if (assets.length) {
      const result = await handover(db,space,user,{
        kind:'issue',target:'new',person:body,ids:assets,date:localDate(),
      })
      return respond({ok:true,id:result.personId,slipId:result.id},201)
    }
    const personId = uid()
    await audited(db,space,user,'person',[
      stmt(db,'INSERT INTO people(space,id,name,dob,position,department) VALUES (?,?,?,?,?,?)',
        space,personId,...await personFields(db,space,body)),
    ])
    return respond({ok:true,id:personId},201)
  }
  const fields = await personFields(db,space,body)
  const [result] = await audited(db,space,user,'person',[
    stmt(db,`UPDATE people SET name=?,dob=?,position=?,department=?,rev=rev+1
      WHERE space=? AND id=? AND rev=?`,...fields,space,id,revision(body.rev)),
    stmt(db,`UPDATE devices SET department=?,rev=rev+1,updated=?
      WHERE space=? AND person_id=? AND deleted=0 AND status='assigned' AND changes()>0`,
      fields[3],now(),space,id),
  ])
  conflict(result)
  return respond({ok:true,id})
}

function assetLabel(asset) {
  const label = 'Thiết bị “' + asset.name + '” (' + asset.code + ')'
  if (asset.status !== 'assigned') return label
  if (asset.owner_name) return label + ' đã có liên kết với ' + asset.owner_name +
    (asset.department ? ' (' + asset.department + ')' : '')
  return label + (asset.department ? ' đã được cấp phát cho phòng ' + asset.department : ' đang được cấp phát')
}

async function rejectDuplicateDevice(db, space, id, {code,serial,name}) {
  const asset = await stmt(db,`SELECT d.code,d.name,d.serial,d.status,d.department,p.name AS owner_name,
      CASE WHEN d.code=? COLLATE NOCASE THEN 'code'
        WHEN ?<>'' AND d.serial=? COLLATE NOCASE THEN 'serial' ELSE 'name' END AS matching_field
    FROM devices d LEFT JOIN people p ON p.space=d.space AND p.id=d.person_id
    WHERE d.space=? AND d.deleted=0 AND d.id<>? AND (
      d.code=? COLLATE NOCASE OR (?<>'' AND d.serial=? COLLATE NOCASE) OR (?<>'' AND d.name=? COLLATE NOCASE)
    )
    ORDER BY CASE WHEN d.code=? COLLATE NOCASE THEN 0 WHEN d.serial=? COLLATE NOCASE THEN 1 ELSE 2 END
    LIMIT 1`,code,serial,serial,space,id,code,serial,serial,name,name,code,serial).first()
  if (!asset) return
  const message = {
    code:'Mã tài sản này đã được sử dụng.',
    serial:'Số serial này đã được sử dụng.',
    name:'Tên này đã có trong danh mục. Nếu đây là thiết bị khác, hãy nhập mã tài sản hoặc serial riêng.',
  }[asset.matching_field]
  throw new HttpError(409,assetLabel(asset) + '. ' + message)
}

async function saveDevice(db, space, user, body) {
  const id = str(body.id,'Thiết bị',60)
  const current = id ? await stmt(db,'SELECT * FROM devices WHERE space=? AND id=? AND deleted=0',space,id).first() : null
  must(!id || current,'Thiết bị không tồn tại.',404)
  const rawCode = str(body.code,'Mã tài sản',50)
  const rawName = str(body.name,'Tên thiết bị',120)
  const type = body.type ? select(body.type,types,'Loại thiết bị') : ''
  const serial = str(body.serial,'Số serial',80)
  must(id || rawCode || rawName || type || serial,'Hãy nhập tên, mã tài sản, serial hoặc chọn loại thiết bị.')
  const assetId = id || uid()
  const code = rawCode || current?.code || 'DX-' + assetId.replaceAll('-','').slice(0,12).toUpperCase()
  const name = rawName || type || 'Thiết bị chưa đặt tên'
  const nameOnly = !id && !rawCode && !serial
  const identity = {code,serial:current?.serial.toUpperCase() === serial.toUpperCase() ? '' : serial,name:nameOnly ? name : ''}
  await rejectDuplicateDevice(db,space,id,identity)

  const personId = id ? '' : str(body.personId,'Nhân viên',60)
  const person = personId ? await stmt(db,'SELECT * FROM people WHERE space=? AND id=? AND active=1',space,personId).first() : null
  must(!personId || person,'Hãy chọn nhân viên đang làm việc.')
  const assigned = current?.status === 'assigned'
  const receipt = !id && body.receipt === true
  must(!receipt || !person,'Phiếu nhập kho cần lưu thiết bị vào kho trước khi cấp phát.')
  const receiptStates = ['ready','stored','damaged']
  const stockStatus = assigned ? 'assigned' :
    select(body.status || (receipt?'stored':'ready'),receipt?receiptStates:stockStates,'Tình trạng')
  must(!person || available.includes(stockStatus),'Thiết bị phải ở trạng thái sẵn sàng hoặc lưu giữ để cấp phát.')
  const department = assigned ? current.department : person ? person.department : await departmentName(db,space,body.department,true)
  const note = str(body.note,'Ghi chú',1000)
  const recorded = now()
  const fields = [
    code,name,type,serial,person ? 'assigned' : stockStatus,department,
    str(body.location,'Vị trí',120) || (receipt?'Kho IT':''),note,recorded,
  ]
  try {
    if (id) {
      const [result] = await audited(db,space,user,'device',[
        stmt(db,`UPDATE devices SET code=?,name=?,type=?,serial=?,status=?,department=?,
          location=?,note=?,updated=?,rev=rev+1 WHERE space=? AND id=? AND rev=? AND deleted=0`,
          ...fields,space,id,revision(body.rev)),
      ])
      conflict(result)
      return respond({id})
    }
    const operations = [stmt(db,`INSERT INTO devices(space,id,code,name,type,serial,status,department,location,note,updated,person_id)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?
      WHERE (?='' OR EXISTS(SELECT 1 FROM people WHERE space=? AND id=? AND active=1 AND rev=?))
      AND (?=0 OR NOT EXISTS(SELECT 1 FROM devices WHERE space=? AND deleted=0 AND name=? COLLATE NOCASE))`,
      space,assetId,...fields,personId,personId,space,personId,person?.rev || 0,Number(nameOnly),space,name)]
    if (person) {
      const items = JSON.stringify([{id:assetId,rev:1,code,name,type,serial,condition:'assigned'}])
      operations.push(stmt(db,`INSERT INTO slips(space,id,kind,recipient,department,person_id,event_date,creator,note,items,offboard,created)
        SELECT ?,?,'issue',?,?,?,?,?,?,?,0,? WHERE EXISTS(SELECT 1 FROM devices WHERE space=? AND id=?)`,
        space,uid(),person.name,department,personId,localDate(),user.name,note,items,recorded,space,assetId))
    }
    const [result] = await audited(db,space,user,'device',operations)
    if (!result.meta.changes) {
      await rejectDuplicateDevice(db,space,id,identity)
      throw new HttpError(409,'Hồ sơ nhân viên đã thay đổi. Hãy tải lại và thử lại.')
    }
    return respond({id:assetId},201)
  } catch (error) {
    if (/duplicate_asset_serial|UNIQUE constraint failed: devices/i.test(error.message)) {
      await rejectDuplicateDevice(db,space,id,identity)
    }
    throw error
  }
}

async function handover(db, space, user, body) {
  const kind = select(body.kind,['issue','return'],'Loại phiếu')
  const issue = kind === 'issue'
  const when = date(body.date || localDate(),'Ngày bàn giao')
  const ids = body.ids
  must(Array.isArray(ids) && ids.length <= 1000 && ids.every(id => typeof id === 'string' && id.length <= 60) &&
    new Set(ids).size === ids.length,'Danh sách thiết bị không hợp lệ (tối đa 1.000 thiết bị).')
  const offboard = !issue && body.offboard === true
  const newPerson = issue && body.target === 'new'
  const personTarget = offboard || newPerson || body.target === 'person'
  must(ids.length > 0 || offboard,'Hãy chọn ít nhất một thiết bị.')
  const personId = newPerson ? uid() : personTarget ? str(body.personId,'Nhân viên',60,true) : ''
  let person = null
  if (newPerson) {
    const [name,dob,position,department] = await personFields(db,space,body.person || {})
    person = {name,dob,position,department}
  } else if (personId) {
    person = await stmt(db,'SELECT * FROM people WHERE space=? AND id=?',space,personId).first()
  }
  must(!personId || person?.active || newPerson,'Hãy chọn nhân viên đang làm việc.')
  const department = personId ? person.department : await departmentName(db,space,body.department)
  const recipient = personId ? person.name : department
  const assetSelection = `SELECT d.id,d.rev,d.code,d.name,d.type,d.serial,d.status,d.department,d.person_id,p.name AS owner_name
    FROM devices d LEFT JOIN people p ON p.space=d.space AND p.id=d.person_id
    WHERE d.space=? AND d.deleted=0 AND d.id IN (SELECT value FROM json_each(?))`
  const assets = await rows(stmt(db,assetSelection+' ORDER BY d.code',space,JSON.stringify(ids)))
  must(assets.length === ids.length,'Một hoặc nhiều thiết bị không còn tồn tại.',409)
  for (const asset of assets) {
    const valid = issue ? available.includes(asset.status) :
      asset.status === 'assigned' && asset.person_id === personId && asset.department === department
    must(valid,issue && asset.status === 'assigned' ? assetLabel(asset) + '. Hãy lập phiếu thu hồi trước khi cấp phát lại.' :
      'Thiết bị ' + asset.code + ' không phù hợp với phiếu này.',409)
  }
  const nextStatus = issue ? 'assigned' : select(body.returnStatus || 'ready',['ready','stored','damaged'],'Tình trạng khi trả')
  const location = str(body.location, 'Vị trí', 120) || (issue ? '' : 'Kho IT')
  const snapshot = assets.map(asset => ({ id:asset.id,rev:asset.rev,code:asset.code,name:asset.name,type:asset.type,serial:asset.serial,condition:nextStatus }))
  const serialized = JSON.stringify(snapshot)
  const slip = uid()
  const timestamp = now()
  const operations = [
    stmt(db,`INSERT INTO slips(space,id,kind,recipient,department,person_id,event_date,creator,note,items,offboard,created)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?
      WHERE (SELECT COUNT(*) FROM devices d JOIN json_each(?) a ON a.value->>'id'=d.id
        WHERE d.space=? AND d.deleted=0 AND d.rev=a.value->>'rev')=?
      AND (?=1 OR ?='' OR EXISTS (SELECT 1 FROM people WHERE space=? AND id=? AND active=1 AND rev=?))
      AND (?=0 OR (SELECT COUNT(*) FROM devices WHERE space=? AND person_id=? AND deleted=0 AND status='assigned')=?)`,
      space,slip,kind,recipient,department,personId,when,user.name,str(body.note,'Ghi chú',1000),
      serialized,Number(offboard),timestamp,serialized,space,ids.length,Number(newPerson),personId,
      space,personId,person?.rev || 0,Number(offboard),space,personId,ids.length),
    stmt(db,`UPDATE devices SET status=?,department=?,person_id=?,location=?,updated=?,rev=rev+1
      WHERE space=? AND id IN (SELECT value FROM json_each(?)) AND EXISTS(SELECT 1 FROM slips WHERE space=? AND id=?)`,
      nextStatus,issue ? department : '',issue ? personId : '',location,timestamp,
      space,JSON.stringify(ids),space,slip),
  ]
  if (newPerson) operations.push(stmt(db,`INSERT INTO people(space,id,name,dob,position,department)
    SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM slips WHERE space=? AND id=?)`,
    space,personId,person.name,person.dob,person.position,department,space,slip))
  if (offboard) operations.push(stmt(db,`UPDATE people SET active=0,rev=rev+1 WHERE space=? AND id=?
    AND EXISTS(SELECT 1 FROM slips WHERE space=? AND id=?)`,space,personId,space,slip))
  const [result] = await audited(db,space,user,'handover',operations)
  if (issue && !result.meta.changes) {
    const asset = await stmt(db,assetSelection + " AND d.status='assigned' ORDER BY d.code LIMIT 1",space,JSON.stringify(ids)).first()
    if (asset) throw new HttpError(409,assetLabel(asset) + '. Hãy lập phiếu thu hồi trước khi cấp phát lại.')
  }
  must(result.meta.changes > 0,offboard ? 'Thiết bị hoặc nhân viên đã thay đổi. Khi nghỉ việc, phải chọn toàn bộ thiết bị đang được cấp phát.' :
    'Thiết bị hoặc nhân viên đã thay đổi. Hãy tải lại và thử lại.',409)
  return {id:slip,personId}
}

async function manageDepartment(db, space, user, body) {
  const action = select(body.action,['add','edit','delete'],'Thao tác')
  const id = action==='add' ? uid() : str(body.id,'Mã phòng ban',60,true)
  const current = action==='add' ? null : await stmt(db,'SELECT * FROM departments WHERE space=? AND id=?',space,id).first()
  must(action==='add' || current,'Phòng ban này không còn tồn tại.',404)
  if (action==='delete') {
    try {
      const [result] = await audited(db,space,user,'department',[
        stmt(db,'DELETE FROM departments WHERE space=? AND id=? AND rev=?',space,id,revision(body.rev)),
      ])
      conflict(result)
      return respond({id})
    } catch (error) {
      if (!error.message.includes('department_in_use')) throw error
      const usage = await stmt(db,`SELECT
        (SELECT COUNT(*) FROM people WHERE space=? AND department=?) AS people,
        (SELECT COUNT(*) FROM devices WHERE space=? AND department=? AND deleted=0) AS devices`,
        space,current.name,space,current.name).first()
      throw new HttpError(409,'Phòng ban “'+current.name+'” còn '+usage.people+' hồ sơ nhân viên và '+usage.devices+
        ' thiết bị liên kết. Hãy chuyển hoặc bỏ liên kết phòng ban ở các hồ sơ này trước khi xóa.')
    }
  }

  const name = normalizedName(str(body.name,'Tên phòng ban',100,true))
  const key = departmentKey(name)
  const description = str(body.description,'Mô tả',600)
  try {
    const query = action==='add' ?
      stmt(db,'INSERT INTO departments(space,id,name,name_key,description,updated) VALUES (?,?,?,?,?,?)',space,id,name,key,description,now()) :
      stmt(db,'UPDATE departments SET name=?,name_key=?,description=?,updated=?,rev=rev+1 WHERE space=? AND id=? AND rev=?',
        name,key,description,now(),space,id,revision(body.rev))
    const [result] = await audited(db,space,user,'department',[query])
    conflict(result)
    return respond({id},action==='add'?201:200)
  } catch (error) {
    if (/UNIQUE constraint failed: departments/i.test(error.message)) {
      throw new HttpError(409,'Tên phòng ban “'+name+'” đã được sử dụng trong kho này.')
    }
    throw error
  }
}

const listSize = 25
const pageNumber = url => {
  const page = Number(url.searchParams.get('page') || 1)
  must(Number.isInteger(page) && page>=1 && page<=100000,'Trang không hợp lệ.')
  return page
}

function listResponse(records) {
  return respond({rows:records.slice(0,listSize),more:records.length>listSize})
}

async function warehouseLog(db, space, url) {
  const direction = select(url.searchParams.get('kind'),['in','out'],'Loại giao dịch kho')
  const page = pageNumber(url)
  const slipKind = direction==='in'?'return':'issue'
  const slips = `SELECT id,id AS subject_id,'slip' AS source,kind,recipient AS label,department,event_date AS date,
    creator AS actor,created,json_array_length(items) AS count,offboard,'{}' AS details FROM slips WHERE space=? AND kind=?`
  const receipts = `SELECT id,subject_id,'asset' AS source,'receive' AS kind,subject_label AS label,
    details->>'department' AS department,date(created,'+7 hours') AS date,actor,created,1 AS count,0 AS offboard,details FROM audit_log
    WHERE space=? AND action='stock.receive'`
  const incoming = direction==='in'
  const records = await rows(stmt(db,'SELECT * FROM ('+slips+(incoming?' UNION ALL '+receipts:'')+
    ') ORDER BY created DESC,id DESC LIMIT ? OFFSET ?',space,slipKind,...(incoming?[space]:[]),listSize+1,(page-1)*listSize))
  return listResponse(records.map(record=>({...record,details:JSON.parse(record.details)})))
}

async function auditLog(db, space, url) {
  const topics = {all:'',assets:'device.',people:'person.',departments:'department.',counts:'count.',warehouse:'stock.'}
  const topic = select(url.searchParams.get('topic') || 'all',Object.keys(topics),'Nhóm nhật ký')
  const page = pageNumber(url)
  const filter = topics[topic]
  const records = await rows(stmt(db,`SELECT id,actor,action,subject_id,subject_label,details,created FROM audit_log WHERE space=? AND (?='' OR action LIKE ?)
    ORDER BY created DESC,id DESC LIMIT ? OFFSET ?`,space,filter,filter+'%',listSize+1,(page-1)*listSize))
  return listResponse(records.map(record=>({...record,details:JSON.parse(record.details)})))
}

const countFields = 'id,title,scope,scope_label,note,actor,status,total,checked,discrepancies,created,updated,rev'
const marks = ['','found','missing','review']

async function readCounts(db, space, url) {
  const id = str(url.searchParams.get('id'),'Đợt kiểm kê',60)
  if (!id) {
    const page = pageNumber(url)
    const records = await rows(stmt(db,'SELECT '+countFields+
      ' FROM inventory_counts WHERE space=? ORDER BY created DESC,id DESC LIMIT ? OFFSET ?',
      space,listSize+1,(page-1)*listSize))
    return listResponse(records)
  }
  const [sessions,items] = await db.batch([
    stmt(db,'SELECT '+countFields+' FROM inventory_counts WHERE space=? AND id=?',space,id),
    stmt(db,`SELECT asset_id AS id,code,name,type,serial,asset_status,department,location,holder,mark,note
      FROM inventory_count_items WHERE space=? AND count_id=? ORDER BY code`,space,id),
  ])
  must(sessions.results[0],'Không tìm thấy đợt kiểm kê.',404)
  return respond({session:sessions.results[0],items:items.results})
}

async function createCount(db, space, user, body) {
  const scope = str(body.scope,'Phạm vi kiểm kê',80) || 'all'
  const department = scope.startsWith('dept:') ? await stmt(db,'SELECT name FROM departments WHERE space=? AND id=?',space,scope.slice(5)).first() : null
  must(scope==='all' || scope==='warehouse' || department,'Phạm vi kiểm kê không còn tồn tại. Hãy chọn lại.',409)
  const scopeLabel = department?.name || (scope==='warehouse'?'Trong kho IT':'Tất cả thiết bị')
  const title = str(body.title,'Tên đợt kiểm kê',140) || 'Kiểm kê ' + scopeLabel + ' · ' + localDate().split('-').reverse().join('/')
  const note = str(body.note,'Ghi chú',1000)
  const stamp = now()
  const id = uid()
  let scopeFilter = ''
  const scopeArgs = []
  if (scope==='warehouse') scopeFilter = " AND d.status IN ('ready','stored','damaged')"
  if (department) {
    scopeFilter = " AND d.status='assigned' AND d.department=? AND EXISTS(SELECT 1 FROM departments WHERE space=? AND id=? AND name=? COLLATE BINARY)"
    scopeArgs.push(department.name,space,scope.slice(5),department.name)
  }
  const deviceScope = "d.space=? AND d.deleted=0 AND d.status<>'destroyed'" + scopeFilter
  const [result] = await audited(db,space,user,'count',[
    stmt(db,`INSERT INTO inventory_counts(space,id,title,scope,scope_label,note,actor,total,created,updated)
      SELECT ?,?,?,?,?,?,?,COUNT(*),?,? FROM devices d WHERE ${deviceScope} HAVING COUNT(*)>0`,
      space,id,title,scope,scopeLabel,note,user.name,stamp,stamp,space,...scopeArgs),
    stmt(db,`INSERT INTO inventory_count_items(space,count_id,asset_id,code,name,type,serial,asset_status,department,location,holder)
      SELECT ?,?,d.id,d.code,d.name,d.type,d.serial,d.status,d.department,d.location,COALESCE(p.name,'')
      FROM devices d LEFT JOIN people p ON p.space=d.space AND p.id=d.person_id
      WHERE ${deviceScope} AND EXISTS(SELECT 1 FROM inventory_counts WHERE space=? AND id=?)`,
      space,id,space,...scopeArgs,space,id),
  ])
  must(result.meta.changes,'Phạm vi này hiện không có thiết bị để kiểm kê hoặc phòng ban vừa được đổi tên.',409)
  return respond({id},201)
}

async function updateCount(db, space, user, body) {
  const id = str(body.id,'Đợt kiểm kê',60,true)
  const requested = body.updates ?? []
  const finish = body.finish === true
  must(Array.isArray(requested) && requested.length<=5000,'Danh sách cập nhật kiểm kê không hợp lệ.')
  const [sessions,assets] = await db.batch([
    stmt(db,'SELECT status,rev FROM inventory_counts WHERE space=? AND id=?',space,id),
    stmt(db,'SELECT asset_id AS id,mark FROM inventory_count_items WHERE space=? AND count_id=?',space,id),
  ])
  const session = sessions.results[0]
  must(session,'Không tìm thấy đợt kiểm kê.',404)
  must(session.status==='open','Đợt kiểm kê đã được chốt.',409)
  must(session.rev===Number(body.rev),'Đợt kiểm kê đã được người khác cập nhật. Mở lại để tải tiến độ mới.',409)
  const all = new Map(assets.results.map(asset=>[asset.id,asset.mark]))
  const affected = new Set()
  const updates = requested.map(item=>{
    must(item && all.has(item.id) && !affected.has(item.id),'Có thiết bị không thuộc đợt kiểm kê hoặc bị gửi trùng.')
    affected.add(item.id)
    const mark = select(item.mark,marks,'Kết quả kiểm kê')
    const note = str(item.note,'Ghi chú kiểm kê',240)
    all.set(item.id,mark)
    return {id:item.id,mark,note}
  })
  const checked = [...all.values()].filter(Boolean).length
  const discrepancies = [...all.values()].filter(mark=>mark && mark!=='found').length
  must(!finish || checked===all.size,'Còn '+(all.size-checked)+' thiết bị chưa kiểm tra. Hãy ghi nhận kết quả trước khi chốt.',409)
  if (!finish && !updates.length) return respond({id,rev:session.rev})
  const serialized = JSON.stringify(updates)
  must(encoder.encode(serialized).byteLength<1900000,'Ghi chú kiểm kê quá dài. Hãy lưu tiến độ theo từng phần.',413)
  const writeId = uid()
  const [result] = await audited(db,space,user,'count',[
    stmt(db,`UPDATE inventory_counts SET status=?,checked=?,discrepancies=?,updated=?,rev=rev+1,write_id=?
      WHERE space=? AND id=? AND rev=? AND status='open'`,
      finish?'closed':'open',checked,discrepancies,now(),writeId,space,id,session.rev),
    stmt(db,`UPDATE inventory_count_items AS item SET mark=change.value->>'mark',note=change.value->>'note'
      FROM json_each(?) AS change WHERE item.space=? AND item.count_id=? AND item.asset_id=change.value->>'id'
      AND EXISTS(SELECT 1 FROM inventory_counts WHERE space=? AND id=? AND write_id=?)`,
      serialized,space,id,space,id,writeId),
  ])
  must(result.meta.changes,'Đợt kiểm kê vừa thay đổi. Mở lại để tải tiến độ mới.',409)
  return respond({id,rev:session.rev+1})
}

async function accounts(db, body) {
  if (!body) return respond({ accounts:await rows(stmt(db,
    "SELECT username,name,role,active FROM accounts WHERE username<>'admin' ORDER BY username")) })
  const username = str(body.username,'Tên đăng nhập',48,true).toLowerCase()
  must(/^[a-z0-9][a-z0-9._-]{2,47}$/.test(username) && username !== 'admin','Tên đăng nhập không hợp lệ.')
  if (body.action === 'toggle') {
    const [result] = await db.batch([
      stmt(db,'UPDATE accounts SET active=? WHERE username=?',body.active ? 1 : 0,username),
      stmt(db,'DELETE FROM sessions WHERE username=?',username),
    ])
    must(result.meta.changes,'Không tìm thấy tài khoản.',404)
    return respond({ok:true})
  }
  must(typeof body.password === 'string' && body.password.length >= 10 && body.password.length <= 200,
    'Mật khẩu cần từ 10 đến 200 ký tự.')
  const hash = await passwordHash(body.password)
  if (body.action === 'reset') {
    const [result] = await db.batch([
      stmt(db,'UPDATE accounts SET password_hash=? WHERE username=?',hash,username),
      stmt(db,'DELETE FROM sessions WHERE username=?',username),
    ])
    must(result.meta.changes,'Không tìm thấy tài khoản.',404)
  } else {
    await stmt(db,'INSERT INTO accounts(username,name,role,password_hash) VALUES (?,?,?,?)',
      username,str(body.name,'Họ và tên',120,true),select(body.role,['it','viewer'],'Vai trò'),hash).run()
  }
  return respond({ok:true})
}

async function changePassword(db, env, user, body) {
  const oldPassword = typeof body.oldPassword === 'string' ? body.oldPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  must(oldPassword.length <= 200 && newPassword.length >= 10 && newPassword.length <= 200,
    'Mật khẩu mới cần từ 10 đến 200 ký tự.')
  const record = await stmt(db,'SELECT password_hash FROM accounts WHERE username=?',user.username).first()
  const correct = record ? await passwordMatches(oldPassword,record.password_hash) :
    user.username === 'admin' && env.ADMIN_PASSWORD && same(await digest(oldPassword),await digest(env.ADMIN_PASSWORD))
  must(correct,'Mật khẩu hiện tại không đúng.')
  const newHash = await passwordHash(newPassword)
  const query = record ? stmt(db,'UPDATE accounts SET password_hash=? WHERE username=? AND password_hash=?',
    newHash,user.username,record.password_hash) : stmt(db,'INSERT INTO accounts(username,name,role,password_hash) VALUES (?,?,?,?)',
    user.username,user.name,user.role,newHash)
  const [result] = await db.batch([query,stmt(db,'DELETE FROM sessions WHERE username=? AND changes()>0',user.username)])
  conflict(result)
  return respond({ok:true})
}

async function api(request, env, url) {
  const db = env.DB
  must(db,'Kho dữ liệu chưa được kết nối.',503)
  const post = request.method === 'POST'
  must(post || request.method === 'GET','Phương thức không được hỗ trợ.',405)
  let body
  if (post) {
    must(request.headers.get('Origin') === url.origin && request.headers.get('Content-Type')?.startsWith('application/json'),
      'Yêu cầu gửi từ địa chỉ không hợp lệ.',403)
    const raw = await request.text()
    const limit = url.pathname==='/api/counts'?1300000:100000
    must(raw.length <= limit,'Dữ liệu gửi quá lớn. Hãy lưu tiến độ theo từng phần.',413)
    try { body = JSON.parse(raw) } catch { throw new HttpError(400,'Dữ liệu gửi không hợp lệ.') }
    must(body && typeof body === 'object' && !Array.isArray(body),'Dữ liệu gửi không hợp lệ.')
  }
  const route = url.pathname.slice(5)
  if (route === 'login' && post) return login(db,env,request,body,url)
  const user = await authenticate(request,db)
  if (route === 'me' && !post) return respond({ user })
  must(user,'Phiên đăng nhập đã hết hạn.',401)
  if (route === 'logout' && post) {
    await stmt(db,'DELETE FROM sessions WHERE token=?',await digest(sessionToken(request))).run()
    return respond({ok:true},200,{'Set-Cookie':sessionCookie(url,'',0)})
  }
  if (route === 'password' && post) return changePassword(db,env,user,body)
  const space = select(request.headers.get('X-Inventory-Workspace') || 'demo',['demo','live'],'Kho')
  if (route === 'state' && !post) {
    await ensureDepartments(db,space)
    if (space==='demo') await seedDemo(db)
    return respond(await inventory(db,space,user))
  }
  if (route === 'warehouse' && !post) return warehouseLog(db,space,url)
  if (route === 'counts' && !post) return readCounts(db,space,url)
  if (route === 'audit' && !post) {
    must(user.role==='it','Chỉ bộ phận IT được xem nhật ký thao tác.',403)
    return auditLog(db,space,url)
  }
  must(user.role === 'it','Tài khoản của bạn chỉ có quyền xem.',403)
  if (route === 'accounts') {
    must(user.username === 'admin','Chỉ quản trị viên được quản lý tài khoản.',403)
    return accounts(db,body)
  }
  if (post && ['people','devices','slips','departments','delete-device','counts'].includes(route)) {
    await ensureDepartments(db,space)
    if (space==='demo') await seedDemo(db)
  }
  if (route === 'departments' && post) return manageDepartment(db,space,user,body)
  if (route === 'counts' && post) {
    const action = select(body.action,['create','update'],'Thao tác kiểm kê')
    return action==='create' ? createCount(db,space,user,body) : updateCount(db,space,user,body)
  }
  if (route === 'people' && post) return savePerson(db,space,user,body)
  if (route === 'devices' && post) return saveDevice(db,space,user,body)
  if (route === 'slips' && post) return respond(await handover(db,space,user,body),201)
  if (route === 'delete-device' && post) {
    const id = str(body.id,'Thiết bị',60,true)
    const [deleted] = await audited(db,space,user,'device',[
      stmt(db,`UPDATE devices SET deleted=1,rev=rev+1,updated=?
        WHERE space=? AND id=? AND rev=? AND status<>'assigned' AND deleted=0`,now(),space,id,revision(body.rev)),
    ])
    if (!deleted.meta.changes) {
      const asset = await stmt(db,`SELECT d.name,d.code,d.status,d.department,p.name AS owner_name
        FROM devices d LEFT JOIN people p ON p.space=d.space AND p.id=d.person_id
        WHERE d.space=? AND d.id=? AND d.deleted=0`,space,id).first()
      must(asset,'Thiết bị không còn trong danh mục.',404)
      must(asset.status!=='assigned',assetLabel(asset)+'. Hãy thu hồi thiết bị trước khi xóa.',409)
      conflict(deleted)
    }
    return respond({ok:true})
  }
  throw new HttpError(404,'Không tìm thấy trang.')
}

export default {
  async fetch(request,env) {
    const url = new URL(request.url)
    try {
      if (url.pathname.startsWith('/api/')) return await api(request,env,url)
      const workspace = url.pathname === '/app' || url.pathname === '/app/'
      const asset = staticAssets[workspace ? '/' : url.pathname]
      if (!asset || !['GET','HEAD'].includes(request.method)) return new Response('Not found',{status:404})
      if (workspace) {
        must(env.DB,'Kho dữ liệu chưa được kết nối.',503)
        if (!await authenticate(request,env.DB)) {
          return new Response(null,{status:303,headers:{Location:'/','Cache-Control':'no-store',Vary:'Cookie'}})
        }
      }
      const [type,base64] = asset
      return new Response(request.method === 'HEAD' ? null : Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),{headers:{
        'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',
        'Cache-Control':workspace || url.pathname === '/' ? 'no-store' : 'public, max-age=300',
        ...(workspace ? {Vary:'Cookie'} : {}),
        'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'",
      }})
    } catch (error) {
      if (error instanceof HttpError) return respond({error:error.message},error.status)
      if (/department_unavailable/i.test(error.message)) return respond({error:'Phòng ban vừa được đổi hoặc xóa. Hãy tải lại rồi chọn phòng ban.'},409)
      if (/D1_ERROR|D1_EXEC_ERROR/i.test(error.message) && /overload|timeout|timed out|unavailable/i.test(error.message)) {
        return respond({error:'Kho dữ liệu đang bận. Chờ một lúc rồi tải lại để kiểm tra trước khi thử lại.'},503)
      }
      if (/UNIQUE constraint failed/i.test(error.message)) return respond({error:'Mã tài sản hoặc tên đăng nhập đã được sử dụng.'},409)
      console.error(error.stack || error.message)
      return respond({error:'Không thể xử lý yêu cầu. Vui lòng thử lại.'},500)
    }
  },
}

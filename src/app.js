import { downloadSlipWord } from './slip-word.js'
import { downloadSlipExcel } from './slip-excel.js'

const root = document.querySelector('#app')
const dialog = document.querySelector('#dialog')
const toast = document.querySelector('#toast')
const vietnamDate = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'})
const today = () => vietnamDate.format(new Date())
const number = value => new Intl.NumberFormat('vi-VN').format(value)
const displayDate = value => value ? (value.includes('T') ? vietnamDate.format(new Date(value)) : value).split('-').reverse().join('/') : '—'
const noDepartment = 'Chưa có phòng ban'
const types = ['Màn hình','PC','Laptop','Scanner','Máy in','Server','Switch','Firewall']
const statuses = {
  assigned:['Đã cấp phát','#5145cd','#eeebff','#5038bd'],
  ready:['Sẵn sàng cấp phát','#279a74','#e5f7ee','#087656'],
  stored:['Lưu giữ','#5990e4','#eaf2ff','#2e60a9'],
  damaged:['Hư hại','#e6a14d','#fff2dd','#915919'],
  destroyed:['Đã phá hủy','#d87a91','#fae9ee','#a2334c'],
}
const pages = {
  overview:['Tổng quan','grid'], devices:['Thiết bị','monitor'],
  departments:['Phòng ban','building'],
  people:['Nhân viên','users'], counts:['Kiểm kê','check'],
  inbound:['Nhập kho','inbound'], outbound:['Xuất kho','outbound'],
  slips:['Phiếu bàn giao','file'], audit:['Lịch sử / Audit','history'], accounts:['Tài khoản','shield'],
}
const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/>',
  monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
  laptop:'<rect x="5" y="4" width="14" height="12" rx="1.5"/><path d="m5 16-3 4h20l-3-4M9 20h6"/>',
  pc:'<rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M9 7h6M9 10h6m-3 7h.01"/>',
  scanner:'<path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3M3 12h18"/>',
  printer:'<path d="M6 8V3h12v5M6 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/><path d="M18 11h.01"/>',
  server:'<rect x="3" y="4" width="18" height="7" rx="1.3"/><rect x="3" y="13" width="18" height="7" rx="1.3"/><path d="M7 7.5h.01M7 16.5h.01M13 7.5h4M13 16.5h4"/>',
  network:'<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h.01m3 0h.01m3 0h.01m3 0h.01M7 14h10"/>',
  shield:'<path d="M12 22s7-3.5 7-9V5l-7-3-7 3v8c0 5.5 7 9 7 9Z"/><path d="m9 12 2 2 4-4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6"/><circle cx="9" cy="7" r="4"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h6"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  exit:'<path d="M10 17l5-5-5-5m5 5H3m9-8h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  right:'<path d="m9 6 6 6-6 6"/>', left:'<path d="m15 6-6 6 6 6"/>',
  down:'<path d="m6 9 6 6 6-6"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16 9"/>',
  box:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9M8 5.25l8 4.5"/>',
  inbound:'<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 3v12m-4-4 4 4 4-4"/>',
  outbound:'<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3m-4 4 4-4 4 4"/>',
  history:'<path d="M3 12a9 9 0 1 1 2.6 6.4M3 5v7h7m2-5v5l3 2"/>',
  hand:'<path d="M3 12h4l3-4h5a2 2 0 0 1 0 4h-3m3 0 4-3a2 2 0 0 1 2.5 3L15 18H7l-4-2Zm0-1v6"/>',
  bars:'<path d="M4 20V5m0 15h17m-13-4v-4m4 4V9m4 7V6m4 10v-6"/>',
  building:'<rect x="5" y="3" width="14" height="18" rx="1.2"/><path d="M9 7h.01m6 0h.01M9 11h.01m6 0h.01M9 15h.01m6 0h.01M10 21v-3h4v3"/>',
  eye:'<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.3"/>',
  pen:'<path d="M12 20H5a1 1 0 0 1-1-1v-7L15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 2m10-14 4 4"/>',
  trash:'<path d="M3 6h18m-14 0 1 14h8l1-14M9 6V3h6v3m-4 4v6m2-6v6"/>',
  key:'<circle cx="8" cy="9" r="4"/><path d="m11 12 9 9m-4-4 3-3m-5 1 3-3"/>',
}
const typeIcons = ['monitor','pc','laptop','scanner','printer','server','network','shield']
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const icon = name => '<svg class="icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">'+(icons[name] || icons.box)+'</svg>'
const badgeIcon = (name, color='') => '<span class="badge-icon '+color+'">'+icon(name)+'</span>'
const mark = '<span class="brand-mark"><img src="/logo.png" alt="Logo DRÄXLMAIER"></span>'
const options = (items, selected='', placeholder='') =>
  (placeholder ? '<option value="">'+escape(placeholder)+'</option>' : '') +
  items.map(item => {
    const [value,label] = Array.isArray(item) ? item : [item,item]
    return '<option value="'+escape(value)+'"'+(value===selected?' selected':'')+'>'+escape(label)+'</option>'
  }).join('')
const status = value => {
  const [label,,bg,fg] = statuses[value]
  return '<span class="status" style="--tag:'+bg+';--fg:'+fg+'"><span class="dot"></span>'+label+'</span>'
}
const dataButton = (action,label,glyph='',variant='',value='') =>
  '<button type="button" class="btn '+variant+'" data-action="'+action+'" data-value="'+escape(value)+'">'+(glyph?icon(glyph):'')+escape(label)+'</button>'
const iconButton = (action,label,glyph,value='') =>
  '<button type="button" class="icon-btn" title="'+escape(label)+'" aria-label="'+escape(label)+'" data-action="'+action+'" data-value="'+escape(value)+'">'+icon(glyph)+'</button>'
const initials = name => escape(name.trim().split(/\s+/).slice(-2).map(word=>word[0]).join('').toUpperCase())
const norm = text => String(text ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d')
const includes = (query, ...parts) => norm(parts.join(' ')).includes(norm(query.trim()))
const peopleById = () => new Map(state.people.map(person=>[person.id,person]))
const personLabel = person => [person.name,person.employee_code,person.department].filter(Boolean).join(' · ')
const matchesPerson = (query,person) => includes(query,person.name,person.employee_code,person.position,person.department)
const departmentNames = () => state.departments.map(department=>department.name)
const get = (name,id) => state[name].find(row=>row.id===id)
const canEdit = () => user?.role === 'it'
const admin = () => user?.username === 'admin'
let space = localStorage.getItem('draexl-space') === 'live' ? 'live' : 'demo'
let user = null
let state = {devices:[],people:[],slips:[],departments:[]}
let accountRows = []
let route = 'overview'
let filters = { q:'', status:'', department:'', type:'', page:1, size:10 }
let peopleQuery = ''
let slipQuery = ''
let slipKind = ''
let formSubmit = null
let noticeTimer
let logView = {page:1,topic:'all',rows:[],more:false}
let routeRequest = 0
const isWorkspace = () => location.pathname === '/app' || location.pathname === '/app/'

async function api(path, body, workspace=space) {
  let response
  try {
    response = await fetch('/api/'+path,{
      method:body === undefined ? 'GET' : 'POST',
      headers:{'X-Inventory-Workspace':workspace,...(body === undefined ? {} : {'Content-Type':'application/json'})},
      ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    })
  } catch {
    throw new Error('Mất kết nối với máy chủ. Hãy tải lại để kiểm tra kết quả trước khi thử lại.')
  }
  const text = await response.text()
  let result
  try { result = JSON.parse(text) } catch { throw new Error('Không thể kết nối máy chủ. Vui lòng tải lại trang.') }
  if (!response.ok) {
    if (response.status === 401 && user && path !== 'login') {
      returnToLogin('Phiên đăng nhập đã hết hạn.',true)
    }
    throw new Error(result.error || 'Máy chủ không xử lý được yêu cầu ('+response.status+').')
  }
  return result
}

function notice(message,kind='info') {
  const feedback = dialog.open && dialog.querySelector(kind==='error'?'.form-error':'.dialog-feedback')
  if (feedback) {
    showFeedback(feedback,message)
    return
  }
  clearTimeout(noticeTimer)
  toast.textContent = message
  toast.dataset.kind = kind
  toast.classList.add('toast')
  noticeTimer = setTimeout(() => {toast.textContent=''; toast.classList.remove('toast')},kind==='error'?6500:4300)
}

function showLogin(message='') {
  root.innerHTML = '<main class="login"><section class="login-main"><div class="login-brand">'+mark+'<span>Draexl IT</span></div>'+
    '<div class="login-card"><h1>Đăng nhập</h1><p>Cổng quản lý thiết bị IT của DRÄXLMAIER Việt Nam. Dùng tài khoản được cấp để tra cứu thiết bị, kiểm kê và bàn giao.</p>'+
    '<form id="login-form" class="form-stack"><label>Tên đăng nhập<input name="username" placeholder="Nhập tên đăng nhập" required autocomplete="username" maxlength="48"></label>'+
    '<label>Mật khẩu<span class="password"><input name="password" type="password" placeholder="Nhập mật khẩu" required autocomplete="current-password" maxlength="200">'+iconButton('show-password','Hiện mật khẩu','eye')+'</span></label>'+
    '<button class="btn primary" type="submit">Đăng nhập</button></form>'+
    '<p id="login-error" class="form-error" role="alert" '+(message?'':'hidden')+'>'+escape(message)+'</p></div>'+
    '<div class="login-footer">DRÄXLMAIER Việt Nam · Cổng nội bộ</div></section>'+
    '<aside class="login-visual"><a class="logo-full" href="/logo.png" target="_blank" rel="noopener"><img src="/logo.png" alt="Logo DRÄXLMAIER"></a>'+
    '<h2>Quản lý thiết bị IT tập trung</h2><p>Tra cứu tài sản, theo dõi thiết bị đã cấp phát và lưu phiếu bàn giao theo từng phòng ban.</p>'+
    '<div class="login-stats"><div class="login-stat">'+icon('monitor')+' Danh mục thiết bị</div><div class="login-stat">'+icon('file')+' Bàn giao & thu hồi</div></div></aside></main>'
}

function returnToLogin(message='',keepSection=false) {
  user = null
  state = {devices:[],people:[],slips:[],departments:[]}
  accountRows = []
  logView = {page:1,topic:'all',rows:[],more:false}
  routeRequest++
  resetFilters()
  peopleQuery = slipQuery = slipKind = ''
  if (dialog.open) dialog.close()
  const hash = keepSection ? location.hash : ''
  history.replaceState(null,'','/'+hash)
  showLogin(message)
}

function currentRoute() {
  const value = location.hash.slice(1).split('/')[0]
  return Object.hasOwn(pages,value) && pageAllowed(value) ? value : 'overview'
}

function pageAllowed(page) {
  return (page!=='accounts'||admin()) && (page!=='audit'||canEdit())
}

function currentDepartment() {
  const part = location.hash.split('/')[1]
  if (!part) return null
  if (part === 'unassigned') return ''
  return state.departments.find(department=>department.id===part||encodeURIComponent(department.name)===part)?.name ?? null
}

async function refresh() {
  state = await api('state')
  await loadRouteData()
}

async function loadRouteData() {
  const pending = ++routeRequest
  const selected = route
  if (selected==='accounts' && admin()) {
    const result = await api('accounts')
    if (pending===routeRequest) accountRows = result.accounts
  }
  const page = logView.page
  let path = ''
  if (selected==='inbound'||selected==='outbound') path = 'warehouse?kind='+(selected==='inbound'?'in':'out')+'&page='+page
  if (selected==='counts') path = 'counts?page='+page
  if (selected==='audit') path = 'audit?topic='+encodeURIComponent(logView.topic)+'&page='+page
  if (!path) return
  const data = await api(path)
  if (pending===routeRequest) logView = {...logView,...data}
}

function heading(title,subtitle,actions='') {
  return '<div class="page-head"><div><h1>'+title+'</h1><p>'+subtitle+'</p></div>'+
    (actions?'<div class="actions">'+actions+'</div>':'')+'</div>'
}

function shell(content) {
  const name = space === 'demo' ? 'Kho mẫu' : 'Kho công ty'
  const nav = Object.entries(pages).filter(([key])=>pageAllowed(key)).map(([key,[label,glyph]]) =>
    '<a href="#'+key+'" '+(key===route?'aria-current="page"':'')+'>'+icon(glyph)+label+'</a>').join('')
  root.innerHTML = '<div class="shell"><aside class="sidebar" id="sidebar"><a class="brand" href="#overview">'+mark+
    '<div><div class="brand-name">Draexl IT</div><div class="brand-sub">DRÄXLMAIER VIỆT NAM</div></div></a>'+
    '<button type="button" class="icon-btn sidebar-close" aria-label="Đóng menu" data-action="menu-close">'+icon('close')+'</button>'+
    '<nav class="nav" aria-label="Điều hướng chính"><div class="nav-label">QUẢN LÝ TÀI SẢN IT</div>'+nav+'</nav>'+
    '<div class="sidebar-bottom"><button class="workspace-switch" data-action="workspace">'+icon('layers')+
    '<span><strong>'+name+'</strong><small>Chuyển kho</small></span><span class="chev">'+icon('down')+'</span></button>'+
    '<div class="side-user"><span class="avatar">'+initials(user.name)+'</span><div class="who"><strong>'+escape(user.name)+'</strong><small>'+
    (canEdit()?'Quản trị IT':'Quyền xem')+'</small></div>'+iconButton('profile','Cài đặt tài khoản','key')+
    iconButton('logout','Đăng xuất','exit')+'</div></div></aside>'+
    '<button type="button" class="nav-backdrop" data-action="menu-close" aria-label="Đóng điều hướng" tabindex="-1"></button><main>'+
    '<header class="topbar"><button type="button" class="icon-btn mobile-menu" aria-label="Menu" aria-expanded="false" aria-controls="sidebar" data-action="menu">'+
    icon('menu')+'<span>Menu</span></button>'+
    '<div class="crumb"><span class="crumb-root">Tài sản IT</span><span class="crumb-sep">'+icon('right')+'</span><strong>'+pages[route][0]+'</strong></div>'+
    '<div class="top-right"><button type="button" title="'+(space==='demo'?'Dữ liệu giả lập để dùng thử':'Kho thiết bị nội bộ')+
    '" aria-label="Chuyển kho, '+name+'" data-action="workspace" class="space-tag '+space+'"><span class="dot"></span>'+name+'</button></div>'+
    '</header><section class="content">'+content+'</section></main></div>'
}

function metric(label,value,glyph,color,key) {
  return '<button class="metric" data-action="status-filter" data-value="'+key+'"><span><span class="metric-label">'+label+
    '</span><strong class="metric-value">'+number(value)+'</strong></span>'+badgeIcon(glyph,color)+'</button>'
}

function overview() {
  const count = Object.fromEntries(Object.keys(statuses).map(key=>[key,0]))
  const groups = Object.fromEntries(departmentNames().map(key=>[key,0]))
  for (const device of state.devices) {
    count[device.status]++
    if (device.status === 'assigned' && Object.hasOwn(groups,device.department)) groups[device.department]++
  }
  const ranked = Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,4)
  const total = state.devices.length
  const distribution = Object.entries(statuses).map(([key,[,tone]]) =>
    count[key] ? '<span style="--tone:'+tone+';flex:'+count[key]+'"></span>' : '').join('')
  const legend = Object.entries(statuses).map(([key,[label,tone]])=>'<button data-action="status-filter" data-value="'+key+
    '" style="--tone:'+tone+'"><span class="dot"></span>'+label+'<strong>'+number(count[key])+'</strong></button>').join('')
  const charts = '<div class="analytics"><section class="panel"><div class="panel-head"><div><h2>Phân bố trạng thái</h2>'+
    '<p>Tình trạng thiết bị trong kho đang xem</p></div><span class="plain-icon">'+icon('bars')+'</span></div>'+
    '<div class="stack" aria-hidden="true">'+distribution+'</div><div class="legend">'+legend+'</div></section>'+
    '<section class="panel"><div class="panel-head"><div><h2>Cấp phát theo phòng ban</h2>'+
    '<p>Phòng ban có nhiều thiết bị nhất</p></div><span class="plain-icon">'+icon('building')+'</span></div>'+
    '<div class="dept-chart">'+ranked.map(([key,value])=>'<button class="department-bar" data-action="dept-filter" data-value="'+escape(key)+'"><span>'+
      escape(key)+'</span><span class="track"><span style="width:'+Math.round(value/(ranked[0][1]||1)*100)+'%"></span></span><strong>'+
      number(value)+'</strong></button>').join('')+'</div></section></div>'
  const actions = canEdit() ? dataButton('new-slip','Tạo phiếu','file')+dataButton('new-device','Thêm thiết bị','plus','primary') : ''
  return heading('Tổng quan thiết bị','Theo dõi tình trạng và phân bổ tài sản IT tại DRÄXLMAIER Việt Nam.',actions)+
    '<div class="metrics">'+metric('Tổng thiết bị',total,'monitor','','')+
    metric('Đã cấp phát',count.assigned,'hand','blue','assigned')+
    metric('Sẵn sàng cấp phát',count.ready,'check','green','ready')+
    metric('Lưu giữ',count.stored,'box','ochre','stored')+'</div>'+charts+devicePanel(true)
}

function searchBox(id,placeholder,value) {
  return '<label class="search">'+icon('search')+'<input type="search" id="'+id+'" aria-label="'+escape(placeholder)+
    '" placeholder="'+escape(placeholder)+'" value="'+escape(value)+'"></label>'
}

function devicePanel(dashboard=false,inDepartment=false) {
  return '<section class="panel table-panel"><div class="table-head"><div class="title-meta"><h2>'+
    (inDepartment?'Thiết bị đang cấp phát':'Danh sách thiết bị')+'</h2>'+
    '<span class="count" id="device-count"></span></div>'+
    (dashboard?'<a href="#devices" class="link">Xem tất cả</a>':dataButton('reset-filters','Xóa bộ lọc','','compact'))+'</div>'+
    '<div class="filterbar">'+searchBox('device-search','Tìm tên, mã, serial, người giữ…',filters.q)+
    (inDepartment?'':'<select id="filter-department" aria-label="Phòng ban">'+options(departmentNames(),filters.department,'Phòng ban')+'</select>')+
    '<select id="filter-type" aria-label="Loại thiết bị">'+options([...types,['unclassified','Chưa phân loại']],filters.type,'Loại thiết bị')+'</select>'+
    (inDepartment?'':'<select id="filter-status" aria-label="Trạng thái">'+options(Object.entries(statuses).map(([key,[label]])=>[key,label]),filters.status,'Trạng thái')+'</select>')+
    '</div><div id="device-results"></div></section>'
}

function empty(title,description,glyph='box',action='') {
  return '<div class="empty">'+badgeIcon(glyph)+'<h3>'+title+'</h3><p>'+description+'</p>'+action+'</div>'
}

function table(headers,body,{primary=0,wide=[]}={}) {
  const template = document.createElement('template')
  template.innerHTML = '<div class="table-scroll"><table class="responsive-table" role="table"><thead role="rowgroup"><tr role="row">'+
    headers.map(label=>'<th scope="col" role="columnheader">'+label+'</th>').join('')+
    '</tr></thead><tbody role="rowgroup">'+body+'</tbody></table></div>'
  const grid = template.content.querySelector('table')
  const captions = Array.from(grid.tHead.rows[0].cells,cell=>cell.textContent.trim())
  for (const row of grid.tBodies[0].rows) {
    row.setAttribute('role','row')
    for (const [column,cell] of Array.from(row.cells).entries()) {
      cell.setAttribute('role','cell')
      if (column===primary) {
        cell.classList.add('mobile-primary')
        continue
      }
      if (captions[column]==='Chi tiết') {
        cell.classList.add('mobile-redundant')
        continue
      }
      if (wide.includes(column)) cell.classList.add('mobile-wide')
      const label = template.content.ownerDocument.createElement('span')
      label.className = 'mobile-field-label'
      label.setAttribute('aria-hidden','true')
      label.textContent = captions[column]
      cell.prepend(label)
    }
  }
  return template.innerHTML
}

function renderDevices() {
  const results = document.querySelector('#device-results')
  if (!results) return
  const people = peopleById()
  const group = route==='departments' ? currentDepartment() : null
  const scoped = group === null ? state.devices : state.devices.filter(device =>
    device.status==='assigned' && (people.get(device.person_id)?.department ?? device.department)===group)
  const list = scoped.filter(device =>
    (!filters.status||device.status===filters.status) && (!filters.type||(device.type||'unclassified')===filters.type) &&
    (!filters.department||device.department===filters.department) &&
    includes(filters.q,device.code,device.name,device.serial,device.location,device.department,people.get(device.person_id)?.name))
  document.querySelector('#device-count').textContent = number(list.length)
  if (!list.length) {
    results.innerHTML = scoped.length ?
      empty('Không tìm thấy thiết bị','Thử đổi từ khóa hoặc bộ lọc.','search',dataButton('reset-filters','Xóa bộ lọc')) :
      group !== null ? empty('Chưa có thiết bị cấp phát','Thiết bị gắn với nhân viên hoặc cấp phát trực tiếp cho phòng ban sẽ xuất hiện tại đây.') :
      empty('Kho chưa có thiết bị','Thiết bị được thêm vào kho này sẽ xuất hiện tại đây.','box',canEdit()?dataButton('new-device','Thêm thiết bị','plus','primary'):'')
    return
  }
  const size = route === 'overview' ? 6 : filters.size
  const pagesCount = Math.ceil(list.length/size)
  filters.page = Math.min(filters.page,pagesCount)
  const start = (filters.page-1)*size
  const rows = list.slice(start,start+size).map(a=>{
    const id = escape(a.id)
    const person = people.get(a.person_id)
    return '<tr class="clickable" data-action="device-detail" data-value="'+id+'"><td><div class="device-cell">'+
      badgeIcon(typeIcons[types.indexOf(a.type)])+'<div><button class="link device-name" data-action="device-detail" data-value="'+id+'">'+
      escape(a.name)+'</button><small>Mã tài sản '+escape(a.code)+' · Số serial '+escape(a.serial||'chưa có')+'</small></div></div></td>'+
      '<td>'+escape(a.type||'Chưa phân loại')+'</td><td>'+escape(a.department||'—')+'</td><td>'+status(a.status)+'</td>'+
      '<td>'+escape(person?.name||(group!==null?'Cấp chung cho phòng ban':a.location)||'—')+'</td><td>'+iconButton('device-detail','Xem '+a.code,'right',a.id)+'</td></tr>'
  }).join('')
  results.innerHTML = table(['Thiết bị','Loại','Phòng ban','Trạng thái','Người nhận / Vị trí','<span class="muted">Chi tiết</span>'],rows)+
    '<div class="pagination"><span>Hiển thị '+number(start+1)+'–'+number(Math.min(start+size,list.length))+' / '+number(list.length)+' thiết bị</span>'+
    '<div class="pages">'+(route!=='overview'?'<select id="page-size" class="size" aria-label="Thiết bị mỗi trang">'+
    options([[10,'10 / trang'],[25,'25 / trang'],[50,'50 / trang']],filters.size)+'</select>':'')+
    '<button class="icon-btn" aria-label="Trang trước" data-action="page" data-value="-1" '+(filters.page===1?'disabled':'')+'>'+icon('left')+'</button>'+
    '<strong>'+filters.page+' / '+pagesCount+'</strong><button class="icon-btn" aria-label="Trang sau" data-action="page" data-value="1" '+
    (filters.page===pagesCount?'disabled':'')+'>'+icon('right')+'</button></div></div>'
}

function peopleHtml() {
  return heading('Nhân viên','Quản lý hồ sơ và thiết bị đang được cấp phát cho từng người.',
      canEdit()?dataButton('new-person','Thêm nhân viên','plus','primary'):'')+peoplePanel()
}

function peoplePanel() {
  return '<section class="panel table-panel"><div class="table-head"><h2>Danh sách nhân viên</h2></div>'+
    '<div class="filterbar">'+searchBox('people-search','Tìm tên, mã nhân viên, phòng ban…',peopleQuery)+'</div><div id="people-results"></div></section>'
}

function renderPeople() {
  const container = document.querySelector('#people-results')
  if (!container) return
  const department = route==='departments' ? currentDepartment() : null
  const list = state.people.filter(p=>(department===null||p.department===department)&&matchesPerson(peopleQuery,p))
  if (!list.length) {
    container.innerHTML = empty('Không có nhân viên phù hợp','Hồ sơ nhân viên của kho này sẽ xuất hiện tại đây.','users')
    return
  }
  const counts = new Map()
  state.devices.filter(a=>a.status==='assigned'&&a.person_id).forEach(a=>counts.set(a.person_id,(counts.get(a.person_id)||0)+1))
  container.innerHTML = table(['Nhân viên','Chức danh','Phòng ban','Đang giữ','Trạng thái',canEdit()?'Thao tác':'Chi tiết'],list.map(p=>
    '<tr class="clickable" data-action="person-detail" data-value="'+escape(p.id)+'"><td><div class="device-cell"><span class="avatar">'+initials(p.name)+
    '</span><div><button class="link device-name" data-action="person-detail" data-value="'+escape(p.id)+'">'+escape(p.name)+'</button>'+
    '<small>Mã NV '+escape(p.employee_code||'—')+'</small></div></div></td>'+
    '<td>'+escape(p.position||'—')+'</td><td>'+escape(p.department||'—')+'</td><td>'+number(counts.get(p.id)||0)+'</td><td>'+
    membership(p.active)+'</td><td><div class="actions">'+iconButton('person-detail','Xem '+p.name,'right',p.id)+
    (canEdit()?iconButton('edit-person','Sửa '+p.name,'pen',p.id)+iconButton('delete-person','Xóa '+p.name,'trash',p.id):'')+
    '</div></td></tr>').join(''))
}

function departmentsHtml() {
  const selected = currentDepartment()
  if (selected !== null) {
    const back = '<a class="link department-back" href="#departments">Tất cả phòng ban</a>'
    const dept = state.departments.find(record=>record.name===selected)
    const manage = canEdit() && dept ? dataButton('edit-department','Sửa phòng ban','pen','',dept.id)+
      dataButton('delete-department','Xóa','trash','danger',dept.id) : ''
    const add = canEdit() ? dataButton('new-person','Thêm nhân viên','plus','primary',selected) : ''
    return back+heading(escape(selected||noDepartment),escape(dept?.description||'Nhân viên và thiết bị đang được cấp phát.'),manage+add)+
      '<div class="department-detail">'+peoplePanel()+devicePanel(false,true)+'</div>'
  }

  const people = peopleById()
  const counts = new Map([...departmentNames(),''].map(department=>[department,{people:0,devices:0}]))
  for (const person of state.people) {
    const group = counts.get(person.department)
    if (group && person.active) group.people++
  }
  for (const device of state.devices) {
    const group = counts.get(people.get(device.person_id)?.department ?? device.department)
    if (group && device.status==='assigned') group.devices++
  }
  const cards = [...state.departments]
  if (counts.get('').people || counts.get('').devices) cards.push({id:'unassigned',name:''})
  return heading('Phòng ban','Quản lý phòng ban, nhân viên và thiết bị đang cấp phát.',
      canEdit()?dataButton('new-department','Thêm phòng ban','plus','primary'):'')+
    (cards.length?'<div class="department-grid">'+cards.map(department=>{
      const count = counts.get(department.name)
      return '<article class="panel department-card"><a class="department-summary" href="#departments/'+encodeURIComponent(department.id)+'">'+badgeIcon('building')+
        '<h2>'+escape(department.name||noDepartment)+'</h2>'+
        (department.description?'<p class="department-description">'+escape(department.description)+'</p>':'')+
        '<div class="department-counts"><span><strong>'+number(count.people)+
        '</strong> Nhân viên</span><span><strong>'+number(count.devices)+'</strong> Thiết bị cấp phát</span></div></a>'+
        (canEdit() && department.name?'<div class="actions">'+
          dataButton('edit-department','Sửa','pen','compact',department.id)+
          dataButton('delete-department','Xóa','trash','compact danger',department.id)+'</div>':'')+'</article>'
    }).join('')+'</div>':'<section class="panel">'+empty('Chưa có phòng ban','Phòng ban mới sẽ xuất hiện ở đây.','building')+'</section>')
}

function membership(active,isAccount=false) {
  return '<span class="status" style="--tag:'+(active?'#e5f7ee':'#f1eff7')+';--fg:'+(active?'#087656':'#616078')+'"><span class="dot"></span>'+
    (active?(isAccount?'Hoạt động':'Đang làm việc'):(isAccount?'Đã khóa':'Đã nghỉ việc'))+'</span>'
}

const slipLabel = slip => slip.offboard ? 'Thu hồi thiết bị khi nghỉ việc' : slip.kind==='issue' ? 'Bàn giao thiết bị' : 'Thu hồi thiết bị'
const slipCode = slip => 'PB-' + slip.id.slice(0,8).toUpperCase()

function slipsHtml() {
  return heading('Phiếu bàn giao','Theo dõi phiếu cấp phát, thu hồi và thiết bị của nhân viên nghỉ việc.',
      canEdit()?dataButton('offboard','Tạo phiếu nghỉ việc','file')+dataButton('new-slip','Tạo phiếu','plus','primary'):'')+
    '<section class="panel table-panel"><div class="table-head"><h2>Lịch sử phiếu</h2></div><div class="filterbar">'+
    searchBox('slip-search','Tìm mã phiếu, người nhận, thiết bị…',slipQuery)+
    '<select id="slip-filter" aria-label="Loại phiếu">'+options([['issue','Bàn giao thiết bị'],['return','Thu hồi thiết bị'],['offboard','Nghỉ việc']],slipKind,'Loại phiếu')+
    '</select></div><div id="slip-results"></div></section>'
}

function renderSlips() {
  const container = document.querySelector('#slip-results')
  if (!container) return
  const list = state.slips.filter(s=>(!slipKind||(slipKind==='offboard'?s.offboard:s.kind===slipKind)) &&
    includes(slipQuery,slipCode(s),s.recipient,s.department,...s.items.flatMap(a=>[a.name,a.code])))
  if (!list.length) {
    container.innerHTML = empty('Không có phiếu phù hợp','Phiếu đã lưu có thể mở lại và in từ danh sách này.','file')
    return
  }
  container.innerHTML = table(['Mã phiếu','Loại phiếu','Người nhận / Đơn vị','Ngày thực hiện','Thiết bị','Chi tiết'],list.map(s=>
    '<tr class="clickable" data-action="slip-detail" data-value="'+s.id+'"><td><button class="link" data-action="slip-detail" data-value="'+s.id+'">'+
    slipCode(s)+'</button></td><td>'+slipLabel(s)+'</td><td>'+escape(s.recipient)+'</td><td>'+displayDate(s.event_date)+'</td>'+
    '<td>'+s.items.length+'</td><td>'+iconButton('slip-detail','Xem phiếu '+slipCode(s),'right',s.id)+'</td></tr>').join(''))
}

function accountsHtml() {
  const rows = accountRows.map(a=>'<tr><td><strong>'+escape(a.username)+'</strong></td><td>'+escape(a.name)+'</td><td>'+
    (a.role==='it'?'Bộ phận IT':'Chỉ xem')+'</td><td>'+membership(a.active,true)+'</td><td><div class="actions">'+
    dataButton('reset-password','Đặt mật khẩu','key','compact',a.username)+
    dataButton('toggle-account',a.active?'Khóa':'Mở khóa','','compact',a.username)+'</div></td></tr>').join('')
  return heading('Tài khoản','Cấp quyền truy cập cho đồng nghiệp và bộ phận IT.',
      dataButton('new-account','Thêm tài khoản','plus','primary'))+
    '<section class="panel table-panel"><div class="table-head"><h2>Tài khoản ứng dụng</h2></div>'+
    (rows?table(['Tên đăng nhập','Họ và tên','Vai trò','Trạng thái','Thao tác'],rows,{wide:[4]}):
      empty('Chưa có tài khoản nào được thêm','Tạo tài khoản Chỉ xem hoặc Bộ phận IT để phân quyền.','shield'))+'</section>'
}

const clockFormat = new Intl.DateTimeFormat('vi-VN',{
  dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh',
})
const formatTime = value => value ? clockFormat.format(new Date(value)) : '—'
const logLink = (action,label,id) => '<button type="button" class="link" data-action="'+action+'" data-value="'+escape(id)+'">'+escape(label)+'</button>'
const countLabels = {found:'Đã thấy',missing:'Thiếu',review:'Cần kiểm tra', '':'Chưa kiểm tra'}
const countChoices = Object.entries(countLabels).filter(([key])=>key)
const auditLabels = {
  'department.create':'Thêm phòng ban','department.update':'Sửa phòng ban','department.delete':'Xóa phòng ban',
  'person.create':'Thêm nhân viên','person.update':'Sửa hồ sơ nhân viên','person.offboard':'Chốt nghỉ việc','person.delete':'Xóa hồ sơ nhân viên',
  'device.create':'Thêm thiết bị','device.update':'Sửa thiết bị','device.delete':'Xóa thiết bị',
  'stock.receive':'Nhập thiết bị mới','stock.issue':'Xuất kho / cấp phát','stock.return':'Nhập kho / thu hồi',
  'count.create':'Tạo đợt kiểm kê','count.update':'Lưu tiến độ kiểm kê','count.close':'Chốt kiểm kê',
}

function logPanel(title,headers,content,description,glyph,controls='',layout) {
  const pagination = '<div class="pagination"><span>Trang '+logView.page+'</span><div class="pages">'+
    '<button class="icon-btn" aria-label="Trang trước" data-action="log-page" data-value="-1" '+(logView.page===1?'disabled':'')+'>'+icon('left')+'</button>'+
    '<button class="icon-btn" aria-label="Trang sau" data-action="log-page" data-value="1" '+(!logView.more?'disabled':'')+'>'+icon('right')+'</button></div></div>'
  return '<section class="panel table-panel"><div class="table-head"><h2>'+title+'</h2></div>'+controls+
    (content?table(headers,content,layout):empty('Chưa có mục nào',description,glyph))+
    (logView.more||logView.page>1?pagination:'')+'</section>'
}

function warehouseHtml(inbound) {
  const labels = {receive:'Nhập mới',return:'Thu hồi',issue:'Cấp phát'}
  const actions = !canEdit() ? '' : inbound ?
    dataButton('receive-return','Nhận thiết bị trả','file')+dataButton('receive-device','Nhập thiết bị mới','plus','primary') :
    dataButton('issue-stock','Tạo phiếu xuất','outbound','primary')
  const content = logView.rows.map(record=>{
    const action = record.source==='asset'?'receipt-detail':'slip-detail'
    const label = record.source==='asset'?record.details.code+' · '+record.label:record.label
    return '<tr class="clickable" data-action="'+action+'" data-value="'+escape(record.id)+'"><td>'+
      escape(record.offboard?'Thu hồi khi nghỉ việc':labels[record.kind])+'</td><td>'+logLink(action,label,record.id)+
      '</td><td>'+escape(record.department||'—')+'</td><td>'+displayDate(record.date)+'</td><td>'+number(record.count)+
      '</td><td>'+escape(record.actor)+'</td></tr>'
  }).join('')
  return heading(inbound?'Nhập kho':'Xuất kho',inbound?'Tiếp nhận thiết bị mới và thiết bị được trả về kho.':
    'Cấp phát thiết bị cho nhân viên hoặc phòng ban và tra cứu phiếu xuất.',actions)+
    logPanel(inbound?'Lịch sử nhập kho':'Lịch sử xuất kho',['Giao dịch','Thiết bị / Đối tượng','Phòng ban','Ngày','Số lượng','Người thực hiện'],
      content,'Các giao dịch đã lưu sẽ xuất hiện tại đây.',inbound?'inbound':'outbound','',{primary:1})
}

function receiptDetail(id) {
  const record = logView.rows.find(row=>row.id===id && row.source==='asset')
  if (!record) return
  const d = record.details
  const foot = dataButton('close','Đóng')+(get('devices',record.subject_id)?
    dataButton('device-detail','Xem thiết bị','monitor','primary',record.subject_id):'')
  open('Chi tiết nhập kho',details([
    ['Thiết bị',record.label],['Mã tài sản',d.code],['Số serial',d.serial],
    ['Loại thiết bị',d.type],['Trạng thái khi nhập',statuses[d.status]?.[0]],['Vị trí',d.location],
    ['Phòng ban',d.department],['Ngày nhập',displayDate(record.date)],['Người thực hiện',record.actor],['Ghi chú',d.note,true],
  ]),foot)
}

function auditHtml() {
  const categories = [['all','Tất cả thao tác'],['assets','Thiết bị'],['people','Nhân viên'],['departments','Phòng ban'],
    ['warehouse','Nhập / xuất kho'],['counts','Kiểm kê']]
  const controls = '<div class="filterbar"><select id="audit-topic" aria-label="Lọc nhật ký">'+options(categories,logView.topic)+'</select></div>'
  const content = logView.rows.map(record=>'<tr class="clickable" data-action="audit-detail" data-value="'+escape(record.id)+'"><td>'+
    formatTime(record.created)+'</td><td>'+logLink('audit-detail',auditLabels[record.action]||record.action,record.id)+'</td><td>'+
    escape(record.subject_label)+'</td><td>'+escape(record.actor)+'</td></tr>').join('')
  return heading('Lịch sử / Audit','Tra cứu thao tác theo thời gian, người thực hiện và hồ sơ liên quan.')+
    logPanel('Nhật ký thao tác',['Thời gian','Thao tác','Hồ sơ','Người thực hiện'],content,
      'Nhật ký được ghi tự động khi một thao tác được lưu.', 'history',controls,{primary:1})
}

function auditDetail(id) {
  const record = logView.rows.find(row=>row.id===id)
  if (!record) return
  const d = record.details
  const rows = [
    ['Hồ sơ',record.subject_label],['Người thực hiện',record.actor],['Thời gian',formatTime(record.created)],
  ]
  if (d.code) rows.push(['Mã tài sản',d.code])
  if (d.oldCode && d.oldCode!==d.code) rows.push(['Mã trước đó',d.oldCode])
  if (d.oldName && d.oldName!==record.subject_label) rows.push(['Tên trước đó',d.oldName])
  if ('department' in d) rows.push(['Phòng ban',d.department])
  if ('oldDepartment' in d && d.oldDepartment!==d.department) rows.push(['Phòng ban trước đó',d.oldDepartment])
  if (d.status) rows.push(['Trạng thái',statuses[d.status]?.[0]])
  if (d.oldStatus && d.oldStatus!==d.status) rows.push(['Trạng thái trước đó',statuses[d.oldStatus]?.[0]])
  if ('count' in d) rows.push(['Số thiết bị',number(d.count)])
  if ('total' in d) rows.push(['Tổng thiết bị',number(d.total)])
  if ('checked' in d) rows.push(['Đã kiểm tra',number(d.checked)],['Có chênh lệch',number(d.discrepancies)])
  if (d.description) rows.push(['Mô tả',d.description,true])
  open(escape(auditLabels[record.action]||record.action),details(rows),dataButton('close','Đóng'))
}

function countState(status) {
  return status==='closed'
    ? '<span class="status" style="--tag:#e5f7ee;--fg:#087656"><span class="dot"></span>Đã chốt</span>'
    : '<span class="status" style="--tag:#eeebff;--fg:#5038bd"><span class="dot"></span>Đang kiểm kê</span>'
}

function countsHtml() {
  const content = logView.rows.map(record=>'<tr class="clickable" data-action="count-detail" data-value="'+escape(record.id)+'"><td>'+
    logLink('count-detail',record.title,record.id)+'</td><td>'+escape(record.scope_label)+'</td><td>'+number(record.checked)+
    ' / '+number(record.total)+'</td><td>'+number(record.discrepancies)+'</td><td>'+countState(record.status)+
    '</td><td>'+displayDate(record.created)+'</td></tr>').join('')
  return heading('Kiểm kê','Đối chiếu thiết bị thực tế với danh sách tại thời điểm mở đợt kiểm kê.',
      canEdit()?dataButton('new-count','Tạo đợt kiểm kê','plus','primary'):'')+
    logPanel('Đợt kiểm kê',['Đợt kiểm kê','Phạm vi','Đã kiểm tra','Chênh lệch','Trạng thái','Ngày tạo'],
      content,'Đợt kiểm kê đã tạo sẽ xuất hiện tại đây.','check')
}

function countForm() {
  const scopes = [['all','Tất cả thiết bị'],['warehouse','Trong kho IT'],
    ...state.departments.map(department=>['dept:'+department.id,department.name])]
  const body = '<div class="form-grid">'+input('title','Tên đợt kiểm kê','','maxlength="140"')+
    selectField('scope','Phạm vi kiểm kê',scopes,'all')+noteField()+'</div>'
  open('Tạo đợt kiểm kê',body,cancel()+submitButton('Tạo đợt kiểm kê'),async values=>{
    const result = await api('counts',{action:'create',...values})
    await saved('Đã tạo đợt kiểm kê.')
    await countDetail(result.id)
    dialogSuccess('Đã tạo đợt kiểm kê.')
  })
}

async function countDetail(id) {
  const workspace = space
  const {session,items} = await api('counts?id='+encodeURIComponent(id))
  if (workspace!==space) return
  const editable = canEdit() && session.status==='open'
  const draft = new Map()
  const pageSize = 20
  let page = 1
  const body = '<div class="count-summary"><div>'+countState(session.status)+'<p>'+
    escape(session.scope_label)+' · '+escape(session.actor)+' · '+displayDate(session.created)+'</p></div>'+
    '<div id="count-progress" aria-live="polite"></div></div>'+
    (session.note?'<p class="dialog-intro">'+escape(session.note)+'</p>':'')+
    '<div class="filterbar count-filters">'+searchBox('count-search','Tìm mã, tên thiết bị, serial hoặc người giữ…','')+
    '<select id="count-mark-filter" aria-label="Lọc kết quả kiểm kê">'+options([['pending','Chưa kiểm tra'],...countChoices],'','Tất cả kết quả')+
    '</select></div><div id="count-items"></div>'
  const foot = editable?dataButton('close','Đóng')+
    '<button type="submit" class="btn">Lưu tiến độ</button><button type="submit" class="btn primary" data-finish="1">Chốt kiểm kê</button>':
    dataButton('close','Đóng')
  const submit = editable ? async (_,button)=>{
    const finish = button?.dataset.finish==='1'
    if (!finish && !draft.size) throw new Error('Chưa có thay đổi để lưu.')
    await api('counts',{action:'update',id,rev:session.rev,updates:[...draft].map(([asset,entry])=>({id:asset,...entry})),finish})
    const message = finish?'Đã chốt đợt kiểm kê.':'Đã lưu tiến độ kiểm kê.'
    await saved(message)
    await countDetail(id)
    dialogSuccess(message)
  } : null
  open(escape(session.title),body,foot,submit,true)

  const search = dialog.querySelector('#count-search')
  const filter = dialog.querySelector('#count-mark-filter')
  const container = dialog.querySelector('#count-items')
  const progress = dialog.querySelector('#count-progress')
  const byId = new Map(items.map(item=>[item.id,item]))
  const value = item => draft.get(item.id) || item
  function renderProgress() {
    const current = items.map(item=>value(item).mark)
    const complete = current.filter(Boolean).length
    const difference = current.filter(mark=>mark && mark!=='found').length
    progress.innerHTML = '<strong>'+number(complete)+' / '+number(items.length)+'</strong> đã kiểm tra'+
      '<br><span>'+number(difference)+' chênh lệch</span>'
  }
  function renderCountItems() {
    const list = items.filter(item=>(!filter.value || value(item).mark===(filter.value==='pending'?'':filter.value)) &&
      includes(search.value,item.code,item.name,item.serial,item.holder,item.department,item.location))
    const maxPage = Math.max(1,Math.ceil(list.length/pageSize))
    page = Math.min(page,maxPage)
    const rows = list.slice((page-1)*pageSize,page*pageSize).map(item=>{
      const record = value(item)
      const label = escape(item.name+' · '+item.code)
      const summary = '<strong>'+escape(item.name)+'</strong><br><small>'+escape(item.code+(item.serial?' · '+item.serial:''))+'</small>'
      const result = editable ? '<select data-item="'+escape(item.id)+'" data-field="mark" aria-label="Kết quả '+label+'">'+
        options(countChoices,record.mark,'Chưa kiểm tra')+'</select>' : escape(countLabels[record.mark])
      const note = editable ? '<input data-item="'+escape(item.id)+'" data-field="note" aria-label="Ghi chú '+label+
        '" maxlength="240" value="'+escape(record.note)+'" placeholder="Ghi chú">' : escape(record.note||'—')
      return '<tr><td>'+summary+'</td><td>'+escape(item.holder||item.location||item.department||'—')+'</td><td>'+result+'</td><td>'+note+'</td></tr>'
    }).join('')
    container.innerHTML = rows ? table(['Thiết bị','Người giữ / Vị trí lúc mở','Kết quả','Ghi chú'],rows,{wide:[1,2,3]})+
      '<div class="pagination"><span>'+number(list.length)+' thiết bị phù hợp</span><div class="pages">'+
      '<button type="button" class="icon-btn" aria-label="Trang trước" data-count-page="-1" '+(page===1?'disabled':'')+'>'+icon('left')+'</button>'+
      '<strong>'+page+' / '+maxPage+'</strong><button type="button" class="icon-btn" aria-label="Trang sau" data-count-page="1" '+
      (page===maxPage?'disabled':'')+'>'+icon('right')+'</button></div></div>' :
      empty('Không có thiết bị phù hợp','Thử đổi từ khóa hoặc kết quả kiểm kê.','search')
  }
  const searchChanged = ()=>{page=1;renderCountItems()}
  search.addEventListener('input',searchChanged)
  filter.addEventListener('change',searchChanged)
  container.addEventListener('click',event=>{
    const button = event.target.closest('[data-count-page]')
    if (button) {page+=Number(button.dataset.countPage);renderCountItems()}
  })
  container.addEventListener('input',event=>{
    const field = event.target
    const original = byId.get(field.dataset.item)
    if (!original) return
    const current = value(original)
    const next = {mark:current.mark,note:current.note,[field.dataset.field]:field.value}
    if (next.mark===original.mark && next.note===original.note) draft.delete(original.id)
    else draft.set(original.id,next)
    renderProgress()
  })
  renderProgress()
  renderCountItems()
}

function departmentForm(id) {
  const department = state.departments.find(record=>record.id===id)
  const body = '<div class="form-grid">'+input('name','Tên phòng ban *',department?.name,'required maxlength="100"','span')+
    '<label class="span">Mô tả<textarea name="description" maxlength="600">'+escape(department?.description)+'</textarea></label></div>'
  open(department?'Sửa phòng ban':'Thêm phòng ban',body,cancel()+submitButton('Lưu phòng ban'),async values=>{
    const result = await api('departments',{action:department?'edit':'add',id:department?.id,rev:department?.rev,...values})
    await saved(department?'Đã cập nhật phòng ban.':'Đã thêm phòng ban.')
    location.hash = 'departments/' + result.id
  })
}

function deleteDepartment(id) {
  const department = state.departments.find(record=>record.id===id)
  if (!department) throw new Error('Phòng ban này không còn tồn tại.')
  open('Xóa phòng ban','<p>Bạn muốn xóa phòng ban <strong>'+escape(department.name)+'</strong>?</p>',
    cancel()+submitButton('Xóa phòng ban','danger'),async ()=>{
      await api('departments',{action:'delete',id,rev:department.rev})
      await saved('Đã xóa phòng ban '+department.name+'.')
      location.hash='departments'
    })
}

function render() {
  if (!user) return
  if (route==='overview') shell(overview())
  if (route==='devices') shell(heading('Thiết bị','Tra cứu, lọc và quản lý danh mục tài sản IT.',
    canEdit()?dataButton('new-slip','Tạo phiếu','file')+dataButton('new-device','Thêm thiết bị','plus','primary'):'')+devicePanel())
  if (route==='people') shell(peopleHtml())
  if (route==='departments') shell(departmentsHtml())
  if (route==='inbound'||route==='outbound') shell(warehouseHtml(route==='inbound'))
  if (route==='counts') shell(countsHtml())
  if (route==='audit') shell(auditHtml())
  if (route==='slips') shell(slipsHtml())
  if (route==='accounts') shell(accountsHtml())
  renderDevices()
  renderPeople()
  renderSlips()
}

function open(title,body,foot='',submit=null,wide=false) {
  formSubmit = submit
  dialog.classList.toggle('wide',wide)
  dialog.innerHTML = '<div class="dialog-head"><h2 id="dialog-title">'+title+'</h2>'+
    iconButton('close','Đóng','close')+'</div>'+
    (submit?'<form id="dialog-form">':'')+'<div class="dialog-body"><p class="dialog-feedback" role="status" hidden></p>'+
    '<p class="form-error" role="alert" hidden></p>'+body+'</div>'+
    (foot?'<div class="dialog-foot">'+foot+'</div>':'')+(submit?'</form>':'')
  if (!dialog.open) dialog.showModal()
  dialog.scrollTop = 0
}

const cancel = () => dataButton('close','Hủy')
const submitButton = (label,variant='primary') => '<button type="submit" class="btn '+variant+'">'+label+'</button>'
const input = (name,label,value='',attrs='',className='') => '<label class="'+className+'">'+label+
  '<input name="'+name+'" value="'+escape(value)+'" '+attrs+'></label>'
const selectField = (name,label,items,selected,placeholder='',attrs='') => '<label>'+label+'<select name="'+name+'" '+attrs+'>'+
  options(items,selected,placeholder)+'</select></label>'
const noteField = (value='') => '<label class="span">Ghi chú<textarea name="note" maxlength="1000">'+escape(value)+'</textarea></label>'
const details = pairs => '<dl class="details">'+pairs.map(([title,text,full])=>'<div class="'+(full?'span':'')+'"><dt>'+title+
  '</dt><dd>'+escape(text||'—')+'</dd></div>').join('')+'</dl>'
const viewLink = (action,label,value,aside='') => '<button type="button" data-action="'+action+'" data-value="'+escape(value)+'">'+
  '<span>'+escape(label)+'</span><span>'+escape(aside)+'</span></button>'

async function saved(message) {
  dialog.close()
  notice(message,'success')
  try {
    await refresh()
    render()
  } catch {
    notice(message+' Chưa tải lại được danh sách. Hãy làm mới trang để xem bản ghi.', 'error')
  }
}

function showFeedback(box,message) {
  box.textContent = message
  box.hidden = false
  if (dialog.contains(box)) box.scrollIntoView({block:'nearest'})
}

function dialogSuccess(message) {
  const feedback = dialog.querySelector('.dialog-feedback')
  if (!feedback || !dialog.open) return
  dialog.querySelector('.form-error').hidden = true
  showFeedback(feedback,message)
}

function locationField(value='', archive=false) {
  const locations = [...new Set(['Kho IT',...departmentNames(),...(value?[value]:[])])]
  return selectField('location','Vị trí thiết bị',locations,value,archive?'':'Chọn vị trí')
}

function employeePicker(label='Nhân viên',placeholder='Chọn nhân viên',required=false) {
  return '<div class="employee-picker">'+searchBox('employee-search','Tìm tên, mã nhân viên, phòng ban…','')+
    selectField('personId',label,[],'',placeholder,required?'required':'')+
    '<small class="muted" id="employee-matches" aria-live="polite" hidden></small></div>'
}

function bindEmployeePicker(id='') {
  const search = dialog.querySelector('#employee-search')
  const field = dialog.querySelector('[name="personId"]')
  const matchesLabel = dialog.querySelector('#employee-matches')
  const people = state.people.filter(person=>person.active)
  const placeholder = field.options[0].textContent
  function renderEmployees(selected) {
    const matches = people.filter(p=>matchesPerson(search.value,p))
    const visible = matches.slice(0,40)
    const current = people.find(person=>person.id===selected)
    if (current && !visible.includes(current)) visible.unshift(current)
    field.innerHTML = options(visible.map(p=>[p.id,personLabel(p)]),selected,placeholder)
    matchesLabel.textContent = !matches.length?'Không tìm thấy nhân viên phù hợp.':
      matches.length>40?'Hiển thị 40 kết quả. Nhập thêm để thu hẹp.':''
    matchesLabel.hidden = !matchesLabel.textContent
  }
  search.addEventListener('input',()=>renderEmployees(field.value))
  search.addEventListener('keydown',event=>{if (event.key==='Enter') event.preventDefault()})
  renderEmployees(id)
}

function deviceDetail(id) {
  const a = get('devices',id)
  if (!a) return
  const p = get('people',a.person_id)
  const activity = state.slips.filter(s=>s.items.some(item=>item.id===id))
  const info = '<div class="detail-title">'+badgeIcon(typeIcons[types.indexOf(a.type)])+'<div><h3>'+escape(a.name)+'</h3><p>'+
    escape(a.type||'Chưa phân loại')+'</p></div>'+status(a.status)+'</div>'+
    details([['Mã tài sản',a.code],['Số serial',a.serial||'Chưa có'],['Phòng ban',a.department],['Người sử dụng',p?.name],['Vị trí',a.location],
      ['Cập nhật',displayDate(a.updated)],['Ghi chú',a.note,true]])+
    '<section class="history"><h3>Lịch sử bàn giao</h3>'+
    (activity.length?activity.map(s=>viewLink('slip-detail',slipLabel(s)+' · '+slipCode(s),s.id,displayDate(s.event_date))).join(''):
      '<p class="muted">Thiết bị chưa có phiếu bàn giao.</p>')+'</section>'
  let foot = dataButton('close','Đóng')
  if (canEdit()) {
    if (a.status!=='assigned') foot += dataButton('delete-device','Xóa','trash','danger',id)
    foot += dataButton('edit-device','Sửa','pen','',id)
    if (a.status==='assigned') foot += dataButton('return-device','Thu hồi','file','primary',id)
    if (['ready','stored'].includes(a.status)) foot += dataButton('issue-device','Cấp phát','hand','primary',id)
  }
  open('Chi tiết thiết bị',info,foot)
}

function deviceForm(id, receipt=false) {
  const a = get('devices',id) || {}
  const assigned = a.status === 'assigned'
  const states = Object.entries(statuses).filter(([key])=>assigned?key==='assigned':key!=='assigned'&&(!receipt||key!=='destroyed'))
    .map(([key,[label]])=>[key,label])
  const form = (id?'':'<p class="dialog-intro">Điền tên, mã tài sản, serial hoặc chọn loại thiết bị. Mã tài sản được tạo tự động nếu để trống.</p>')+
    '<div class="form-grid">'+input('code','Mã tài sản',a.code,'maxlength="50"')+
    input('name','Tên thiết bị',a.name,'maxlength="120"')+
    selectField('type','Loại thiết bị',types,a.type,'Chưa phân loại')+
    input('serial','Số serial',a.serial,'maxlength="80"')+
    selectField('status','Trạng thái',states,a.status||(receipt?'stored':'ready'),'',assigned?'disabled':'')+
    selectField('department','Phòng ban',departmentNames(),a.department,'Không chỉ định',assigned?'disabled':'')+
    (id||receipt?'':'<div class="span">'+employeePicker('Gắn với nhân viên','Chưa cấp phát')+'</div>')+
    '<div class="span">'+locationField(a.location||(receipt?'Kho IT':''),receipt)+'</div>'+noteField(a.note)+'</div>'
  open(id?'Sửa thiết bị':receipt?'Nhập thiết bị mới':'Thêm thiết bị',form,cancel()+submitButton(receipt?'Lưu nhập kho':'Lưu thiết bị'),async values=>{
    const result = await api('devices',{...values,id:a.id,rev:a.rev,receipt})
    const message = id?'Đã cập nhật thiết bị.':receipt?'Đã nhập thiết bị vào kho.':
      values.personId?'Đã thêm và cấp phát thiết bị.':'Đã thêm thiết bị.'
    await saved(message)
    if (id || values.personId) {
      deviceDetail(result.id)
      dialogSuccess(message)
    }
  })
  if (!id && !receipt) {
    bindEmployeePicker()
    const fields = dialog.querySelector('form').elements
    let stockStatus = fields.status.value
    let stockDepartment = fields.department.value
    fields.status.addEventListener('change',()=>{stockStatus=fields.status.value})
    fields.department.addEventListener('change',()=>{stockDepartment=fields.department.value})
    fields.personId.addEventListener('change',()=>{
      const recipient = get('people',fields.personId.value)
      fields.status.disabled = fields.department.disabled = Boolean(recipient)
      if (recipient) {
        fields.status.innerHTML = options([['assigned','Đã cấp phát']],'assigned')
        fields.department.value = recipient.department
      } else {
        fields.status.innerHTML = options(states,stockStatus)
        fields.department.value = stockDepartment
      }
    })
  }
}

function personFields(person={}) {
  return input('name','Họ và tên *',person.name,'required maxlength="120"')+
    input('employeeCode','Mã nhân viên',person.employee_code,'maxlength="40" '+(person.id?'':'placeholder="Tự tạo nếu để trống"'))+
    input('dob','Ngày sinh',person.dob,'type="date" max="'+today()+'"')+
    input('position','Chức danh',person.position,'maxlength="120"')+
    selectField('department','Phòng ban',departmentNames(),person.department,'Chưa có phòng ban')
}

function personDetail(id) {
  const p = get('people',id)
  if (!p) return
  const assigned = state.devices.filter(a=>a.person_id===id&&a.status==='assigned')
  const content = '<div class="detail-title"><span class="avatar">'+initials(p.name)+'</span><div><h3>'+escape(p.name)+'</h3><p>'+
    escape(p.position||p.department)+'</p></div>'+membership(p.active)+'</div>'+
    details([['Mã nhân viên',p.employee_code],['Phòng ban',p.department],...(canEdit()?[['Ngày sinh',displayDate(p.dob)]]:[])])+
    '<section class="history"><h3>Thiết bị đang được cấp phát ('+assigned.length+')</h3>'+
    (assigned.length?assigned.map(a=>viewLink('device-detail',a.name,a.id,a.code)).join(''):
      '<p class="muted">Nhân viên hiện không giữ thiết bị nào.</p>')+'</section>'
  let foot = dataButton('close','Đóng')
  if (canEdit()) {
    foot += dataButton('delete-person','Xóa hồ sơ','trash','danger',p.id)+dataButton('edit-person','Sửa hồ sơ','pen','',p.id)
    if (p.active) foot += dataButton('offboard','Thu hồi khi nghỉ việc','file','',p.id)+
      dataButton('issue-person','Cấp phát','hand','primary',p.id)
  }
  open('Chi tiết nhân viên',content,foot)
}

function deletePerson(id) {
  const person = get('people',id)
  if (!person) throw new Error('Hồ sơ nhân viên này không còn tồn tại.')
  open('Xóa hồ sơ nhân viên','<p>Xóa vĩnh viễn hồ sơ của <strong>'+escape(person.name)+'</strong> và lịch sử thao tác gắn với hồ sơ này?</p>'+
    '<p class="dialog-intro">Tên và mã nhân viên sẽ được gỡ khỏi phiếu liên quan. Các giao dịch thiết bị vẫn được lưu để đối chiếu kho.</p>',
    cancel()+submitButton('Xác nhận xóa','danger'),async()=>{
      await api('people',{action:'delete',id,rev:person.rev})
      await saved('Đã xóa hồ sơ nhân viên.')
    })
}

function personForm(id, department='') {
  const p = get('people',id) || {department}
  const selected = new Set()
  const picker = id?'':'<details class="attach-section"><summary><span>Gắn thiết bị hiện có</span>'+
    '<span class="count" id="attach-count">0 đã chọn</span></summary><div class="attach-body">'+
    searchBox('attach-search','Tìm mã, tên thiết bị, serial hoặc người giữ…','')+
    '<div class="pick-list" id="attach-list"></div><p class="attach-note" id="attach-note"></p></div></details>'
  open(id?'Sửa hồ sơ':'Thêm nhân viên','<p class="dialog-intro">Chỉ bắt buộc điền họ và tên.</p>'+
    '<div class="form-grid">'+personFields(p)+'</div>'+picker,
    cancel()+submitButton('Lưu hồ sơ'),async values=>{
      const result = await api('people',{...values,id:p.id,rev:p.rev,assetIds:[...selected]})
      const message = selected.size?'Đã lưu hồ sơ và cấp phát thiết bị.':id?'Đã cập nhật hồ sơ nhân viên.':'Đã thêm nhân viên.'
      await saved(message)
      if (id || selected.size) {
        personDetail(result.id)
        dialogSuccess(message)
      }
    })
  if (id) return

  const search = dialog.querySelector('#attach-search')
  const list = dialog.querySelector('#attach-list')
  const count = dialog.querySelector('#attach-count')
  const note = dialog.querySelector('#attach-note')
  const people = peopleById()
  const canAttach = asset => ['ready','stored'].includes(asset.status)
  const choices = [...state.devices].sort((a,b)=>Number(canAttach(b))-Number(canAttach(a)))
  function renderPicker() {
    const query = search.value.trim()
    const matches = choices.filter(asset=>query
      ? includes(query,asset.code,asset.name,asset.serial,people.get(asset.person_id)?.name,asset.department)
      : canAttach(asset))
    list.innerHTML = matches.length ? matches.slice(0,50).map(asset=>{
      const holder = people.get(asset.person_id)?.name || asset.department
      const label = asset.status==='assigned' && holder ? 'Đã gắn với '+holder : statuses[asset.status][0]
      return '<label class="pick-row '+(canAttach(asset)?'':'unavailable')+'"><input type="checkbox" data-attach="'+escape(asset.id)+
        '" '+(selected.has(asset.id)?'checked':'')+' '+(canAttach(asset)?'':'disabled')+'><span>'+escape(asset.code+' · '+asset.name)+
        '</span><small>'+escape(label)+'</small></label>'
    }).join('') : '<div class="empty"><p>Không có thiết bị phù hợp.</p></div>'
    note.textContent = matches.length>50?'Đang hiển thị 50 thiết bị. Dùng ô tìm kiếm để thu hẹp danh sách.':''
  }
  search.addEventListener('input',renderPicker)
  list.addEventListener('change',event=>{
    const field = event.target
    if (field.checked) selected.add(field.dataset.attach)
    else selected.delete(field.dataset.attach)
    count.textContent = selected.size+' đã chọn'
  })
  renderPicker()
}

function handoverForm(preset={}) {
  const a = get('devices',preset.assetId)
  const firstKind = preset.offboard ? 'offboard' : preset.kind || 'issue'
  const personId = preset.personId || a?.person_id || ''
  const firstTarget = firstKind==='return' && a && !personId ? 'department' : 'person'
  let selected = new Set(preset.assetId?[preset.assetId]:[])
  const body = '<div class="form-grid">'+
    selectField('kind','Loại phiếu',[['issue','Bàn giao / cấp phát'],['return','Thu hồi / trả kho'],['offboard','Thu hồi khi nghỉ việc']],firstKind)+
    input('date','Ngày thực hiện',today(),'type="date"')+
    selectField('target','Đối tượng',[],firstTarget)+
    '<div id="target-input"></div><div class="span form-block" id="new-person-fields" hidden></div>'+
    '<p class="span dialog-intro" id="offboard-help" hidden>Phiếu tự chọn toàn bộ thiết bị nhân viên đang giữ. Khi lưu, hồ sơ chuyển sang Đã nghỉ việc và thiết bị được nhập lại kho.</p>'+
    '<div id="return-condition" hidden>'+selectField('returnStatus','Tình trạng khi trả',
      [['ready','Sẵn sàng cấp phát'],['stored','Lưu giữ'],['damaged','Hư hại']],'ready')+'</div>'+
    locationField(firstKind==='issue'?'':'Kho IT')+
    '<div class="span"><div class="pick-title"><span>Thiết bị</span><span class="count" id="picked-count"></span></div>'+
    searchBox('pick-search','Tìm tài sản trong danh sách…','')+'<div class="pick-list" id="pick-list"></div></div>'+
    noteField()+'<details class="span attach-section"><summary>Thông tin trên mẫu công ty</summary>'+
    '<div class="attach-body form-grid">'+input('assetNo','Asset No.','','maxlength="50" placeholder="Tự điền nếu có một thiết bị"')+
    input('costCentre','Cost Centre','','maxlength="50"')+
    input('manager','Quản lý phòng ban','','maxlength="120"')+
    input('itResponsible','Người phụ trách IT',user.name,'maxlength="120"')+'</div></details></div>'
  const slipTitle = {issue:'Tạo phiếu bàn giao',return:'Tạo phiếu thu hồi',offboard:'Tạo phiếu thu hồi khi nghỉ việc'}
  open(slipTitle[firstKind],body,cancel()+submitButton('Lưu phiếu'),async values=>{
    const offboard = values.kind==='offboard'
    const payload = {
      kind:values.kind==='issue'?'issue':'return',target:offboard?'person':values.target,date:values.date,personId:values.personId,
      department:values.department,returnStatus:values.returnStatus,location:values.location,
      offboard,
      ids:[...selected],note:values.note,form:{assetNo:values.assetNo,costCentre:values.costCentre,
        manager:values.manager,itResponsible:values.itResponsible},
      person:{name:values.name,employeeCode:values.employeeCode,
        dob:values.dob,position:values.position,department:values.newDepartment},
    }
    const result = await api('slips',payload)
    const message = offboard?'Đã lưu phiếu thu hồi và cập nhật hồ sơ nghỉ việc.':
      values.kind==='return'?'Đã lưu phiếu thu hồi và đưa thiết bị về kho.':'Đã lưu phiếu cấp phát và cập nhật người nhận.'
    await saved(message)
    slipDetail(result.id)
    dialogSuccess(message)
  },true)
  const form = dialog.querySelector('form')
  const fields = form.elements
  const targetInput = dialog.querySelector('#target-input')
  const newFields = dialog.querySelector('#new-person-fields')
  newFields.innerHTML = '<div class="form-grid">'+personFields().replace('name="department"','name="newDepartment"')+'</div>'
  const offboardHelp = dialog.querySelector('#offboard-help')
  const returnCondition = dialog.querySelector('#return-condition')
  const list = dialog.querySelector('#pick-list')
  const pickSearch = dialog.querySelector('#pick-search')
  const targets = [['person','Nhân viên'],['department','Phòng ban']]
  let candidates = []
  let locationChanged = false
  function updateMode(target, id='', dept='') {
    const issue = fields.kind.value==='issue'
    const offboard = fields.kind.value==='offboard'
    const choices = offboard?targets.slice(0,1):issue?[...targets,['new','Nhân viên mới']]:targets
    fields.target.innerHTML = options(choices,target)
    fields.target.disabled = offboard
    dialog.querySelector('#dialog-title').textContent = slipTitle[fields.kind.value]
    const mode = fields.target.value
    targetInput.innerHTML = mode==='person' ? employeePicker('Nhân viên','Chọn nhân viên',true) :
      mode==='department' ? selectField('department','Phòng ban',departmentNames(),dept,'Chọn phòng ban','required') : ''
    if (mode==='person') bindEmployeePicker(id)
    newFields.hidden = mode!=='new'
    for (const control of newFields.querySelectorAll('input,select')) control.disabled = newFields.hidden
    offboardHelp.hidden = !offboard
    returnCondition.hidden = issue
    suggestLocation()
    updateCandidates()
  }
  function suggestLocation() {
    if (locationChanged) return
    fields.location.value = fields.kind.value==='issue'
      ? fields.department?.value || get('people',fields.personId?.value)?.department ||
        (fields.target.value==='new' ? fields.newDepartment.value : '')
      : 'Kho IT'
    if (fields.location.selectedIndex<0) fields.location.value = ''
  }
  function updateCandidates() {
    const issue = fields.kind.value==='issue'
    const offboard = fields.kind.value==='offboard'
    const department = fields.department?.value
    const person = fields.personId?.value
    candidates = state.devices.filter(asset=>issue ? ['ready','stored'].includes(asset.status) :
      asset.status==='assigned' && (fields.target.value==='person' ?
        person&&asset.person_id===person : department&&!asset.person_id&&asset.department===department))
    const valid = new Set(candidates.map(asset=>asset.id))
    selected = offboard ? valid : new Set([...selected].filter(id=>valid.has(id)))
    renderPick()
  }
  function renderPick() {
    const query = pickSearch.value
    const visible = candidates.filter(asset=>includes(query,asset.code,asset.name,asset.type,asset.serial))
    const offboard = fields.kind.value==='offboard'
    dialog.querySelector('#picked-count').textContent = selected.size+' đã chọn'
    list.innerHTML = visible.length ? visible.map(asset=>'<label class="pick-row"><input type="checkbox" data-pick="'+escape(asset.id)+
      '" '+(selected.has(asset.id)?'checked':'')+' '+(offboard?'disabled':'')+'><span>'+escape(asset.code)+' · '+
      escape(asset.name)+'</span><small>'+escape(asset.type)+'</small></label>').join('') :
      '<div class="empty"><p>'+(offboard?(fields.personId.value?'Nhân viên không còn thiết bị để thu hồi.':'Chọn nhân viên để xem thiết bị.'):'Không có thiết bị phù hợp.')+'</p></div>'
  }
  form.addEventListener('change',event=>{
    const control = event.target
    if (control.name==='kind') {
      locationChanged = false
      updateMode(fields.target.value,fields.personId?.value,fields.department?.value)
    } else if (control.name==='target') {
      updateMode(fields.target.value)
    } else if (['personId','department','newDepartment'].includes(control.name)) {
      suggestLocation()
      updateCandidates()
    } else if (control.name==='location') {
      locationChanged = true
    } else if (control.dataset.pick) {
      if (control.checked) selected.add(control.dataset.pick)
      else selected.delete(control.dataset.pick)
      dialog.querySelector('#picked-count').textContent = selected.size+' đã chọn'
    }
  })
  pickSearch.addEventListener('input',renderPick)
  updateMode(firstTarget,personId,a?.department)
}

function slipItems(items) {
  return items.length ? table(['Mã tài sản','Thiết bị','Serial','Tình trạng'],items.map(a=>'<tr><td>'+escape(a.code)+
    '</td><td>'+escape(a.name)+'</td><td>'+escape(a.serial||'—')+'</td><td>'+escape(statuses[a.condition]?.[0] || '—')+'</td></tr>').join('')) :
    '<p class="muted">Không có thiết bị phải thu hồi.</p>'
}

function slipDocument(slip) {
  const isReturn = slip.kind==='return'
  const employee = get('people',slip.person_id)
  const recipient = slip.recipient || ''
  const department = slip.department || ''
  const employeeCode = slip.form?.employeeCode || employee?.employee_code || ''
  const assetNo = slip.form?.assetNo || (slip.items.length===1?slip.items[0].code:'')
  const costCentre = slip.form?.costCentre || ''
  const date = displayDate(slip.event_date)
  const condition = isReturn && slip.items.length ? statuses[slip.items[0].condition]?.[0] : ''
  const note = [condition?'Tình trạng khi trả: '+condition:'',slip.note].filter(Boolean).join('\n')
  return {
    title:'IT Assets Handover/Return Form',code:slipCode(slip),
    reference:state.companyFormWording?.reference || '',
    acknowledgment:state.companyFormWording?.acknowledgment || '',
    recipient,department,employeeCode,assetNo,costCentre,date,isReturn,note,
    fields:[
      ['Name / Họ tên',recipient],['Asset No.',assetNo],
      ['Department / Phòng ban',department],['Cost Centre',costCentre],
      ['Employee ID / Mã nhân viên',employeeCode],['Ngày thực hiện',date],
      ['Vị trí thiết bị',slip.location],['Người lập phiếu',slip.creator],
    ],
    columns:['Description of Equipments','Model Descriptions','IT Asset Tag','Serial No.','Quantity'],
    items:slip.items.map(asset=>[asset.type || asset.name,asset.type ? asset.name : '',asset.code,asset.serial || '',1]),
    signatures:[
      {label:'Employee Signature',name:slip.person_id?recipient:''},
      {label:'Department Manager',name:slip.form?.manager || ''},
      {label:'IT Responsible',name:slip.form?.itResponsible || slip.creator || ''},
    ],
  }
}

function slipDetail(id) {
  const s = get('slips',id)
  if (!s) return
  const text = '<div class="detail-title">'+badgeIcon('file')+'<div><h3>'+slipLabel(s)+'</h3><p>'+slipCode(s)+'</p></div></div>'+
    details([...slipDocument(s).fields,['Ghi chú',s.note,true]])+
    '<div class="history"><h3>Danh sách thiết bị ('+s.items.length+')</h3>'+slipItems(s.items)+'</div>'
  open('Chi tiết phiếu',text,dataButton('close','Đóng')+dataButton('word-slip','Tải Word','file','',id)+
    (state.hasCompanyTemplate?dataButton('excel-slip','Tải Excel','file','',id):'')+
    dataButton('print-slip','In / Lưu PDF','printer','primary',id),null,true)
}

function printSlip(id) {
  const s = get('slips',id)
  if (!s) return
  const doc = slipDocument(s)
  const items = doc.items.length ? table(doc.columns,doc.items.map(item=>'<tr>'+
    item.map(value=>'<td>'+escape(value)+'</td>').join('')+'</tr>').join('')) :
    '<p>Không có thiết bị phải thu hồi.</p>'
  const signatures = (title,active) => '<section class="print-signatures"><h2>'+title+'</h2><div class="signatures">'+
    doc.signatures.map(({label,name})=>'<div><strong>'+escape(label)+'</strong><p>'+escape(active?name:'')+'</p>'+
      '<div class="signature-space"></div><small>Date: '+escape(active?doc.date:'')+'</small></div>').join('')+
    '</div></section>'
  document.querySelector('#print-area').innerHTML =
    '<div class="print-brand"><img src="/logo.png" alt=""><strong>DRÄXLMAIER Việt Nam</strong></div>'+
    '<h1>'+escape(doc.title)+'</h1><p class="print-code">'+escape([doc.reference,doc.code,slipLabel(s)].filter(Boolean).join(' · '))+'</p>'+
    '<dl class="print-fields">'+doc.fields.map(([label,value])=>'<div><dt>'+escape(label)+'</dt><dd>'+
      escape(value)+'</dd></div>').join('')+'</dl>'+
    (doc.acknowledgment?'<p class="print-note">'+escape(doc.acknowledgment)+'</p>':'')+items+
    '<p><strong>Tổng số thiết bị</strong> '+number(doc.items.length)+'</p>'+
    signatures('Handover of IT Assets',!doc.isReturn)+
    '<p class="print-note"><strong>Notes / Ghi chú</strong> '+escape(doc.note||'—')+'</p>'+
    signatures('Return of IT Assets',doc.isReturn)
  window.print()
}

function workspaceDialog() {
  const option = (id,name,description,glyph) => '<button class="workspace-option" data-action="switch-space" data-value="'+id+'">'+
    badgeIcon(glyph)+'<span><strong>'+name+'</strong><small>'+description+'</small></span>'+
    (space===id?icon('check'):'')+'</button>'
  open('Chọn kho thiết bị',option('demo','Kho mẫu','1.000 thiết bị giả lập để thực hành.','layers')+
    option('live','Kho công ty','Kho làm việc cho dữ liệu thật của DRÄXLMAIER Việt Nam.','building'),dataButton('close','Đóng'))
}

function accountForm(username) {
  const a = accountRows.find(row=>row.username===username)
  const fields = a ? '<p class="dialog-intro">Đặt mật khẩu mới cho '+escape(a.username)+'. Các phiên đang mở sẽ bị đăng xuất.</p>'+
    '<div class="form-stack">'+input('password','Mật khẩu mới','','type="password" required minlength="10" maxlength="200" autocomplete="new-password"')+'</div>' :
    '<div class="form-grid">'+input('username','Tên đăng nhập','','required minlength="3" maxlength="48" autocomplete="off"')+
    input('name','Họ và tên','','required maxlength="120"')+
    selectField('role','Vai trò',[['viewer','Chỉ xem'],['it','Bộ phận IT']],'viewer')+
    input('password','Mật khẩu','','type="password" required minlength="10" maxlength="200" autocomplete="new-password"')+'</div>'
  open(a?'Đặt mật khẩu mới':'Thêm tài khoản',fields,cancel()+submitButton('Lưu tài khoản'),async values=>{
    await api('accounts',a?{action:'reset',username,password:values.password}:values)
    await saved(a?'Đã đặt mật khẩu mới.':'Đã thêm tài khoản.')
  })
}

function profile() {
  open('Đổi mật khẩu','<p class="dialog-intro">Tài khoản '+escape(user.username)+' sẽ đăng xuất sau khi đổi mật khẩu.</p>'+
    '<div class="form-stack">'+input('oldPassword','Mật khẩu hiện tại','','type="password" required autocomplete="current-password" maxlength="200"')+
    input('newPassword','Mật khẩu mới','','type="password" required minlength="10" maxlength="200" autocomplete="new-password"')+
    input('confirm','Nhập lại mật khẩu mới','','type="password" required minlength="10" maxlength="200" autocomplete="new-password"')+'</div>',
    cancel()+submitButton('Đổi mật khẩu'),async values=>{
      if (values.newPassword!==values.confirm) throw new Error('Mật khẩu xác nhận không khớp.')
      await api('password',values)
      returnToLogin()
      notice('Đã đổi mật khẩu. Vui lòng đăng nhập lại.','success')
    })
}

function resetFilters() {
  filters = {...filters,q:'',status:'',department:'',type:'',page:1}
}

function showMenu(visible, restoreFocus=false) {
  const sidebar = document.querySelector('#sidebar')
  const opener = document.querySelector('.mobile-menu')
  if (!sidebar || !opener) return
  sidebar.classList.toggle('open',visible)
  document.querySelector('.nav-backdrop').classList.toggle('open',visible)
  opener.closest('main').inert = visible
  opener.setAttribute('aria-expanded',String(visible))
  if (visible) sidebar.querySelector('.sidebar-close').focus({preventScroll:true})
  else if (restoreFocus) opener.focus({preventScroll:true})
}

const drawerLayout = window.matchMedia('(max-width:960px)')
drawerLayout.addEventListener('change',event=>{
  if (!event.matches && document.querySelector('#sidebar.open')) showMenu(false)
})

const visualViewport = window.visualViewport
if (visualViewport) {
  const updateViewport = () => {
    const viewport = document.documentElement
    const zoomed = Math.abs(visualViewport.scale-1)>0.02
    const bottom = zoomed ? 0 : Math.max(0,viewport.clientHeight-visualViewport.height-visualViewport.offsetTop)
    viewport.style.setProperty('--keyboard-inset',Math.round(bottom)+'px')
    viewport.style.setProperty('--visible-height',zoomed ? '100dvh' : Math.round(visualViewport.height)+'px')
  }
  visualViewport.addEventListener('resize',updateViewport,{passive:true})
  visualViewport.addEventListener('scroll',updateViewport,{passive:true})
  updateViewport()
}

async function navigate(page) {
  if (route==='departments' || page==='departments') {
    resetFilters()
    peopleQuery = ''
  }
  if (route !== page) {
    route = page
    filters.page = 1
    logView = {page:1,topic:'all',rows:[],more:false}
  }
  const hash = location.hash
  try {
    await loadRouteData()
  } finally {
    if (location.hash===hash) {
      render()
      window.scrollTo(0,0)
    }
  }
}

async function handleAction(action,value,element) {
  if (action==='show-password') {
    const field = element.parentElement.querySelector('input')
    field.type = field.type==='password'?'text':'password'
    element.setAttribute('aria-label',field.type==='text'?'Ẩn mật khẩu':'Hiện mật khẩu')
    return
  }
  if (action==='close') { dialog.close(); return }
  if (!user) return
  if (action==='menu') showMenu(true)
  if (action==='menu-close') showMenu(false,true)
  if (action==='workspace') workspaceDialog()
  if (action==='switch-space') {
    const next = await api('state',undefined,value)
    space = value
    localStorage.setItem('draexl-space',space)
    state = next
    resetFilters()
    peopleQuery = slipQuery = slipKind = ''
    logView = {page:1,topic:'all',rows:[],more:false}
    dialog.close()
    await loadRouteData()
    render()
    notice(space==='demo'?'Đang xem kho mẫu.':'Đang xem kho công ty.')
  }
  if (action==='profile') profile()
  if (action==='logout') {
    await api('logout',{})
    returnToLogin()
    notice('Đã đăng xuất.','success')
  }
  if (action==='status-filter' || action==='dept-filter') {
    resetFilters()
    if (action==='status-filter') filters.status=value
    else {filters.department=value; filters.status='assigned'}
    location.hash='devices'
  }
  if (action==='reset-filters') {resetFilters();render()}
  if (action==='page') {filters.page+=Number(value);renderDevices()}
  if (action==='log-page') {
    element.disabled = true
    logView.page += Number(value)
    try {await loadRouteData();render()} finally {element.disabled = false}
  }
  if (action==='count-detail') await countDetail(value)
  if (action==='receipt-detail') receiptDetail(value)
  if (action==='audit-detail' && canEdit()) auditDetail(value)
  if (action==='device-detail') deviceDetail(value)
  if (action==='person-detail') personDetail(value)
  if (action==='slip-detail') slipDetail(value)
  if (action==='print-slip') printSlip(value)
  if (action==='word-slip' || action==='excel-slip') {
    const slip = get('slips',value)
    if (slip) {
      element.disabled = true
      try {
        const doc = slipDocument(slip)
        if (action==='excel-slip') await downloadSlipExcel(doc,space)
        else await downloadSlipWord(doc)
        dialogSuccess(action==='excel-slip'?'Đã tạo file Excel.':'Đã tạo file Word.')
      }
      finally { element.disabled = false }
    }
  }
  if (!canEdit()) return
  if (action==='new-device' || action==='edit-device') deviceForm(value)
  if (action==='receive-device') deviceForm('',true)
  if (action==='receive-return') handoverForm({kind:'return'})
  if (action==='issue-stock') handoverForm({kind:'issue'})
  if (action==='new-count') countForm()
  if (action==='new-department' || action==='edit-department') departmentForm(value)
  if (action==='delete-department') deleteDepartment(value)
  if (action==='new-person') personForm('',value)
  if (action==='edit-person') personForm(value)
  if (action==='delete-person') deletePerson(value)
  if (action==='new-slip') handoverForm()
  if (action==='issue-device' || action==='return-device') handoverForm({kind:action==='issue-device'?'issue':'return',assetId:value})
  if (action==='issue-person') handoverForm({kind:'issue',personId:value})
  if (action==='offboard') handoverForm({kind:'return',personId:value,offboard:true})
  if (action==='delete-device') {
    const a = get('devices',value)
    open('Xóa thiết bị','<p>Bạn muốn xóa <strong>'+escape(a.code+' · '+a.name)+
      '</strong> khỏi danh mục? Các phiếu đã lập vẫn có thể tra cứu.</p>',cancel()+submitButton('Xóa thiết bị','danger'),
      async()=>{await api('delete-device',{id:a.id,rev:a.rev});await saved('Đã xóa thiết bị.')})
  }
  if (admin() && (action==='new-account'||action==='reset-password')) accountForm(value)
  if (admin() && action==='toggle-account') {
    const account = accountRows.find(row=>row.username===value)
    const label = account.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'
    open(label,'<p>'+label+' <strong>'+escape(value)+'</strong>?</p>',cancel()+submitButton(label),async()=>{
      await api('accounts',{action:'toggle',username:value,active:!account.active})
      await saved(account.active?'Đã khóa tài khoản.':'Đã mở khóa tài khoản.')
    })
  }
}

document.addEventListener('click',event=>{
  const element = event.target.closest('[data-action]')
  if (element) {
    handleAction(element.dataset.action,element.dataset.value,element).catch(error=>notice(error.message,'error'))
  } else if (event.target.closest('.sidebar a') && document.querySelector('#sidebar.open')) {
    showMenu(false)
  }
})
document.addEventListener('keydown',event=>{
  if (event.key==='Escape' && !dialog.open && document.querySelector('#sidebar.open')) {
    event.preventDefault()
    showMenu(false,true)
  }
})
document.addEventListener('input',event=>{
  const control = event.target
  if (control.id==='device-search') {filters.q=control.value;filters.page=1;renderDevices()}
  if (control.id==='people-search') {peopleQuery=control.value;renderPeople()}
  if (control.id==='slip-search') {slipQuery=control.value;renderSlips()}
})
document.addEventListener('change',event=>{
  const control = event.target
  const prop = {'filter-department':'department','filter-status':'status','filter-type':'type','page-size':'size'}[control.id]
  if (prop) {filters[prop]=prop==='size'?Number(control.value):control.value;filters.page=1;renderDevices()}
  if (control.id==='slip-filter') {slipKind=control.value;renderSlips()}
  if (control.id==='audit-topic') {
    logView.topic=control.value
    logView.page=1
    loadRouteData().then(render).catch(error=>notice(error.message,'error'))
  }
})
document.addEventListener('submit',async event=>{
  const form = event.target
  if (form.id!=='login-form' && form.id!=='dialog-form') return
  event.preventDefault()
  const buttons = [...form.querySelectorAll('[type=submit]')]
  const errorBox = form.id==='login-form'?root.querySelector('#login-error'):form.querySelector('.form-error')
  if (form.dataset.saving) return
  form.dataset.saving = '1'
  for (const button of buttons) button.disabled = true
  errorBox.hidden = true
  try {
    const values = Object.fromEntries(new FormData(form))
    if (form.id==='login-form') {
      await api('login',values)
      location.replace('/app'+location.hash)
    } else if (formSubmit) await formSubmit(values,event.submitter)
  } catch (error) {
    if (errorBox.isConnected) {
      showFeedback(errorBox,error.message)
    } else notice(error.message,'error')
  } finally {
    delete form.dataset.saving
    for (const button of buttons) button.disabled = false
  }
})
window.addEventListener('hashchange',()=>{if(user) navigate(currentRoute()).catch(error=>notice(error.message,'error'))})
window.addEventListener('pageshow',event=>{
  if (event.persisted && isWorkspace()) location.reload()
})

async function init() {
  if (!isWorkspace()) return showLogin()
  try {
    const result = await api('me')
    user = result.user
    if (!user) return returnToLogin('Phiên đăng nhập đã hết hạn.',true)
    route = currentRoute()
    await refresh()
    render()
  } catch(error) { returnToLogin(error.message,true) }
}
init()

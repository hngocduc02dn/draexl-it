const pages = new Set(['/','/app.js','/style.css','/logo.png'])
const workspacePaths = new Set(['/app','/app/'])
const api = new Map([
  ['/api/me','GET'], ['/api/state','GET'],
  ['/api/login','POST'], ['/api/logout','POST'], ['/api/password','POST'],
  ['/api/people','POST'], ['/api/devices','POST'], ['/api/slips','POST'], ['/api/slip-template','GET'],
  ['/api/delete-device','POST'], ['/api/accounts','GET POST'],
  ['/api/departments','POST'], ['/api/warehouse','GET'], ['/api/counts','GET POST'], ['/api/audit','GET'],
])

function problem(status,error) {
  return Response.json({error},{status,headers:{'Cache-Control':'no-store'}})
}

export default {
  async fetch(request, env) {
    let upstreamOrigin
    try {
      const upstream = new URL(env.UPSTREAM_ORIGIN)
      if (upstream.protocol !== 'https:' || upstream.username || upstream.password ||
          upstream.pathname !== '/' || upstream.search || upstream.hash) {
        return problem(503,'Địa chỉ máy chủ Draexl IT chưa được cấu hình đúng.')
      }
      upstreamOrigin = upstream.origin
    } catch {
      return problem(503,'Địa chỉ máy chủ Draexl IT chưa được cấu hình.')
    }
    const publicUrl = new URL(request.url)
    const path = publicUrl.pathname
    const method = request.method
    const isWorkspace = workspacePaths.has(path)
    const allowed = pages.has(path) || isWorkspace ? 'GET HEAD' : api.get(path)
    if (!allowed) return problem(404,'Không tìm thấy trang.')
    if (!allowed.split(' ').includes(method)) return problem(405,'Phương thức không được hỗ trợ.')

    const headers = new Headers({'Accept-Encoding':'identity'})
    if (method === 'POST') {
      if (request.headers.get('Origin') !== publicUrl.origin ||
          !request.headers.get('Content-Type')?.startsWith('application/json')) {
        return problem(403,'Yêu cầu gửi từ địa chỉ không hợp lệ.')
      }
      headers.set('Origin',upstreamOrigin)
      headers.set('Content-Type','application/json')
    }

    if (api.has(path) || isWorkspace) {
      const workspace = request.headers.get('X-Inventory-Workspace')
      if (workspace) headers.set('X-Inventory-Workspace',workspace)
      const session = request.headers.get('Cookie')?.match(/(?:^|;\s*)(draexl_session=[0-9a-f]{64})(?:;|$)/)?.[1]
      if (session) headers.set('Cookie',session)
    }

    const upstreamUrl = new URL(upstreamOrigin)
    upstreamUrl.pathname = path
    upstreamUrl.search = publicUrl.search
    let response
    try {
      response = await fetch(upstreamUrl,{
        method,headers,redirect:'manual',
        ...(request.body ? {body:request.body,duplex:'half'} : {}),
      })
    } catch {
      return problem(502,'Draexl IT tạm thời không phản hồi.')
    }

    const redirect = response.headers.get('Location')
    if (isWorkspace && response.status===303 && (redirect==='/' || redirect===upstreamOrigin+'/')) {
      return new Response(null,{status:303,headers:{Location:'/','Cache-Control':'no-store',Vary:'Cookie'}})
    }
    const type = response.headers.get('Content-Type') || ''
    const expected = path==='/api/slip-template' && response.ok
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/json'
    if ((response.status >= 300 && response.status < 400) ||
        (api.has(path) && !type.startsWith(expected))) {
      return problem(502,'Không thể kết nối với Draexl IT.')
    }

    const delivered = new Headers()
    for (const name of ['Content-Type','Content-Security-Policy','Content-Encoding','Referrer-Policy','X-Content-Type-Options','Cache-Control','Vary']) {
      const value = response.headers.get(name)
      if (value) delivered.set(name,value)
    }
    if (api.has(path)) {
      delivered.set('Cache-Control','no-store')
      const cookie = response.headers.getSetCookie().find(value=>value.startsWith('draexl_session=') && !/;\s*domain=/i.test(value))
      if (cookie) delivered.set('Set-Cookie',cookie)
    }
    return new Response(response.body,{status:response.status,headers:delivered})
  },
}

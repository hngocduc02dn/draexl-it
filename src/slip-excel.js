import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate'

const sheetNamespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const sheetRelationship = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const itemsPerSheet = 10

function readXml(files,path) {
  const xml = new DOMParser().parseFromString(strFromU8(files[path]),'application/xml')
  if (xml.querySelector('parsererror')) throw new Error('Không đọc được mẫu Excel của công ty.')
  return xml
}

function setCell(sheet, address, value) {
  const row = sheet.querySelector('row[r="'+address.replace(/^[A-Z]+/,'')+'"]')
  let cell = row.querySelector('c[r="'+address+'"]')
  if (!cell) {
    cell = sheet.createElementNS(sheetNamespace,'c')
    cell.setAttribute('r',address)
    const next = [...row.children].find(item=>item.getAttribute('r')?.localeCompare(address)>0)
    row.insertBefore(cell,next || null)
  }
  cell.replaceChildren()
  if (value==='') {
    cell.removeAttribute('t')
    return
  }
  if (typeof value==='number') {
    cell.removeAttribute('t')
    const number = sheet.createElementNS(sheetNamespace,'v')
    number.textContent = String(value)
    cell.append(number)
    return
  }
  cell.setAttribute('t','inlineStr')
  const inline = sheet.createElementNS(sheetNamespace,'is')
  const text = sheet.createElementNS(sheetNamespace,'t')
  text.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve')
  text.textContent = String(value || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')
  inline.append(text)
  cell.append(inline)
}

function fillSheet(sheet,slip,items,offset) {
  const merges = sheet.querySelector('mergeCells')
  function merge(range) {
    if (merges.querySelector('mergeCell[ref="'+range+'"]')) return
    const cell = sheet.createElementNS(sheetNamespace,'mergeCell')
    cell.setAttribute('ref',range)
    merges.append(cell)
  }
  for (const [address,value] of Object.entries({
    B6:slip.recipient,B8:slip.department,B10:slip.employeeCode,K6:slip.assetNo,K8:slip.costCentre,
  })) setCell(sheet,address,value)
  for (const [index,item] of items.entries()) {
    const row = 19 + index*2
    const [description,model,tag,serial,quantity] = item
    for (const [start,end] of [['D','F'],['G','I'],['J','L'],['M','N']]) merge(start+row+':'+end+(row+1))
    setCell(sheet,'A'+row,(offset+index+1)+'. '+description)
    for (const [column,value] of [['D',model],['G',tag],['J',serial],['M',quantity]]) {
      setCell(sheet,column+row,value)
    }
  }
  for (let index=items.length;index<itemsPerSheet;index++) setCell(sheet,'A'+(19+index*2),'')
  if (slip.note) setCell(sheet,'A47',(slip.isReturn?'Notes: ':'Ghi chú bàn giao: ')+slip.note)
  const dateRow = slip.isReturn ? 56 : 44
  const nameRow = dateRow - 2
  for (const [index,[column,end]] of [['A','D'],['F','I'],['K','N']].entries()) {
    merge(column+nameRow+':'+end+nameRow)
    merge(column+dateRow+':'+end+dateRow)
    setCell(sheet,column+nameRow,slip.signatures[index].name)
    setCell(sheet,column+dateRow,'Date: '+slip.date)
  }
  for (const address of ['D41','D44','D53','D56']) setCell(sheet,address,'')
  merges.setAttribute('count',String(merges.children.length))
}

export function fillCompanyWorkbook(template,slip) {
  const files = unzipSync(template)
  const workbook = readXml(files,'xl/workbook.xml')
  const relationships = readXml(files,'xl/_rels/workbook.xml.rels')
  const types = readXml(files,'[Content_Types].xml')
  const sheets = workbook.querySelector('sheets')
  const sheetDefinition = sheets.firstElementChild
  const sheetRelationshipDefinition = [...relationships.documentElement.children]
    .find(node=>node.getAttribute('Type').endsWith('/worksheet'))
  const printableArea = workbook.querySelector('definedName[name="_xlnm.Print_Area"]')
  const sheetType = types.querySelector('Override[PartName="/xl/worksheets/sheet1.xml"]')
  const originalSheet = readXml(files,'xl/worksheets/sheet1.xml')
  const serializer = new XMLSerializer()
  function save(path,xml) { files[path] = strToU8(serializer.serializeToString(xml)) }
  const pageCount = Math.max(1,Math.ceil(slip.items.length/itemsPerSheet))
  for (let page=1;page<=pageCount;page++) {
    const offset = (page-1)*itemsPerSheet
    const sheet = originalSheet.cloneNode(true)
    fillSheet(sheet,slip,slip.items.slice(offset,offset+itemsPerSheet),offset)
    const path = 'xl/worksheets/sheet'+page+'.xml'
    save(path,sheet)
    if (page===1) continue

    const name = 'Sheet'+page
    const id = 'SlipPage'+page
    const definition = sheetDefinition.cloneNode(false)
    definition.setAttribute('name',name)
    definition.setAttribute('sheetId',String(page))
    definition.setAttributeNS(sheetRelationship,'r:id',id)
    sheets.append(definition)
    const relationship = sheetRelationshipDefinition.cloneNode(false)
    relationship.setAttribute('Id',id)
    relationship.setAttribute('Target','worksheets/sheet'+page+'.xml')
    relationships.documentElement.append(relationship)
    const type = sheetType.cloneNode(false)
    type.setAttribute('PartName','/'+path)
    types.documentElement.append(type)
    if (printableArea) {
      const area = printableArea.cloneNode(false)
      area.setAttribute('localSheetId',String(page-1))
      area.textContent = name+'!$A$1:$N$57'
      printableArea.parentElement.append(area)
    }
    const originalRels = files['xl/worksheets/_rels/sheet1.xml.rels']
    if (originalRels) files['xl/worksheets/_rels/sheet'+page+'.xml.rels'] = originalRels
  }
  save('xl/workbook.xml',workbook)
  save('xl/_rels/workbook.xml.rels',relationships)
  save('[Content_Types].xml',types)
  return zipSync(files)
}

export async function downloadSlipExcel(slip,space) {
  const response = await fetch('/api/slip-template',{headers:{'X-Inventory-Workspace':space}})
  if (!response.ok) {
    const error = await response.json().catch(()=>({}))
    throw new Error(error.error || 'Không tải được mẫu Excel của công ty.')
  }
  const bytes = new Uint8Array(await response.arrayBuffer())
  const blob = new Blob([fillCompanyWorkbook(bytes,slip)],{type:xlsxType})
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = slip.code+'.xlsx'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),60000)
}

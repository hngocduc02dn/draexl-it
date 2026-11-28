import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate'
import {readFile,writeFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'

function decode(xml) {
  const entities = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}
  return xml.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>
    entity.startsWith('#x') ? String.fromCodePoint(parseInt(entity.slice(2),16)) :
      entity.startsWith('#') ? String.fromCodePoint(Number(entity.slice(1))) : entities[entity])
}

export function prepareCompanyTemplate(bytes) {
  const files = unzipSync(bytes)
  const workbook = strFromU8(files['xl/workbook.xml'])
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml'])
  if ((workbook.match(/<sheet\s/g) || []).length!==1 || !['B6','B8','B10','K6','K8','A47'].every(cell=>sheet.includes('r="'+cell+'"'))) {
    throw new Error('The company template must use the handover/return sheet layout.')
  }
  const strings = [...strFromU8(files['xl/sharedStrings.xml']).matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(([,entry])=>[...entry.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map(([,value])=>decode(value)).join(''))
  function lookup(cell) {
    const index = sheet.match(new RegExp('<c r="'+cell+'"[^>]*>\\s*<v>(\\d+)<\\/v>'))?.[1]
    return strings[index]?.trim() || ''
  }
  const wording = {reference:lookup('A1'),acknowledgment:lookup('A12')}
  if (!wording.reference || !wording.acknowledgment) throw new Error('The form reference or acknowledgment is missing.')
  const privateMetadata = /docMetadata\/|docProps\/|printerSettings\//
  for (const path of Object.keys(files)) {
    if (privateMetadata.test(path)) delete files[path]
    else if (path.endsWith('.rels') || path==='[Content_Types].xml') {
      const xml = strFromU8(files[path]).replace(/<(?:Relationship|Override)\s[^>]*\/>/g,
        tag=>privateMetadata.test(tag) ? '' : tag)
      files[path] = strToU8(xml)
    }
  }
  files['xl/workbook.xml'] = strToU8(workbook.replace(/<definedName\s[^>]*>[\s\S]*?<\/definedName>/g,
    name=>name.includes('_xlnm.Print_Area') ? name : ''))
  files['xl/worksheets/sheet1.xml'] = strToU8(sheet.replace(/<pageSetup\s[^>]*\/>/g,
    setup=>setup.replace(/\s+r:id="[^"]*"/,'').replace(/\s+usePrinterDefaults="[^"]*"/,'')))
  return {bytes:zipSync(files),wording}
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const [, , input, output] = process.argv
  if (!input || !output) throw new Error('Usage: node company-template.mjs <template.xlsx> <template.sql>')
  const {bytes,wording} = prepareCompanyTemplate(await readFile(input))
  const base64 = Buffer.from(bytes).toString('base64')
  const json = JSON.stringify(wording).replaceAll("'","''")
  await writeFile(output,`INSERT INTO slip_template (id,xlsx_base64,wording) VALUES ('company','${base64}','${json}')
ON CONFLICT(id) DO UPDATE SET xlsx_base64=excluded.xlsx_base64,wording=excluded.wording;\n`,{flag:'wx',mode:0o600})
}

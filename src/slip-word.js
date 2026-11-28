import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell,
  TableLayoutType, TableRow, TextRun, WidthType,
} from 'docx'

const font = 'Arial'
const pageWidth = 10086
const widths = [2396,2670,1890,2050,1080]
const borders = Object.fromEntries(['top','left','bottom','right','insideHorizontal','insideVertical']
  .map(side=>[side,{style:BorderStyle.NONE}]))

function paragraph(text,{bold=false,center=false,size=22,after=100,heading,keepNext=false}={}) {
  return new Paragraph({
    alignment:center ? AlignmentType.CENTER : AlignmentType.LEFT,
    keepNext,
    heading,
    spacing:{after},
    children:String(text).split(/\r?\n/).map((line,index)=>new TextRun({text:line,font,size,bold,break:index?1:0})),
  })
}

function cell(content,width,shaded=false) {
  return new TableCell({
    width:{size:width,type:WidthType.DXA},
    margins:{top:90,bottom:90,left:110,right:110},
    ...(shaded ? {shading:{fill:'EEEEEE'}} : {}),
    children:content,
  })
}

function table(rows,columnWidths,options={}) {
  return new Table({
    width:{size:pageWidth,type:WidthType.DXA},layout:TableLayoutType.FIXED,
    columnWidths,rows,...options,
  })
}

export function createSlipWord(slip) {
  const equipment = slip.items.length ? table([slip.columns,...slip.items].map((row,index)=>
    new TableRow({tableHeader:index===0,cantSplit:true,children:row.map((value,column)=>
      cell([paragraph(value,{size:20,bold:index===0,center:column===4,after:0})],widths[column],index===0))})),widths) :
    paragraph('Không có thiết bị phải thu hồi.')
  const signWidth = pageWidth / 3
  const signatures = active => table([new TableRow({cantSplit:true,children:slip.signatures.map(({label,name})=>
    cell([
      paragraph(label,{bold:true,center:true,keepNext:true}),
      paragraph(active?name:'',{size:19,center:true,after:660,keepNext:true}),
      paragraph('Date: '+(active?slip.date:''),{size:19,center:true,after:0}),
    ],signWidth))})],
    [signWidth,signWidth,signWidth],{borders})
  return new Document({
    creator:'Draexl IT',title:slip.title,
    sections:[{
      properties:{page:{size:{width:11906,height:16838},margin:{top:910,bottom:910,left:910,right:910}}},
      children:[
        paragraph('DRÄXLMAIER Việt Nam',{bold:true,keepNext:true}),
        paragraph(slip.title,{bold:true,center:true,size:29,heading:'Title',keepNext:true}),
        paragraph([slip.reference,slip.code,slip.isReturn?'Thu hồi thiết bị':'Bàn giao thiết bị'].filter(Boolean).join(' · '),
          {center:true,after:195,keepNext:true}),
        ...slip.fields.map(([label,value])=>paragraph(label+'  '+value,{keepNext:true})),
        ...(slip.acknowledgment?[paragraph(slip.acknowledgment,{size:20,after:160})]:[]),
        equipment,
        paragraph('Tổng số thiết bị  '+slip.items.length,{bold:true}),
        paragraph('Handover of IT Assets',{bold:true,keepNext:true}),
        signatures(!slip.isReturn),
        paragraph('Notes / Ghi chú  '+(slip.note || '—'),{after:180}),
        paragraph('Return of IT Assets',{bold:true,keepNext:true}),
        signatures(slip.isReturn),
      ],
    }],
  })
}

export async function downloadSlipWord(slip) {
  const blob = await Packer.toBlob(createSlipWord(slip))
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = slip.code+'.docx'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(()=>URL.revokeObjectURL(url),60000)
}

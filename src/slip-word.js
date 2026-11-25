import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell,
  TableLayoutType, TableRow, TextRun, WidthType,
} from 'docx'

const font = 'Arial'
const pageWidth = 10086
const widths = [570,1740,3230,2030,2516]
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
      cell([paragraph(value,{size:20,bold:index===0,center:column===0,after:0})],widths[column],index===0))})),widths) :
    paragraph('Không có thiết bị phải thu hồi.')
  const signWidth = pageWidth / 3
  const signatures = table([new TableRow({cantSplit:true,children:slip.signatures.map(label=>
    cell([paragraph(label,{bold:true,center:true,keepNext:true}),
      paragraph('Ký và ghi rõ họ tên',{size:19,center:true,after:860})],signWidth))})],
    [signWidth,signWidth,signWidth],{borders})
  return new Document({
    creator:'Draexl IT',title:slip.title,
    sections:[{
      properties:{page:{size:{width:11906,height:16838},margin:{top:910,bottom:910,left:910,right:910}}},
      children:[
        paragraph('DRÄXLMAIER Việt Nam',{bold:true,keepNext:true}),
        paragraph(slip.title,{bold:true,center:true,size:29,heading:'Title',keepNext:true}),
        paragraph('Mã phiếu '+slip.code,{center:true,after:245,keepNext:true}),
        ...slip.fields.map(([label,value])=>paragraph(label+'  '+value,{keepNext:true})),
        equipment,
        paragraph('Tổng số thiết bị  '+slip.items.length,{bold:true}),
        paragraph('Ghi chú  '+slip.note,{after:225}),
        signatures,
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

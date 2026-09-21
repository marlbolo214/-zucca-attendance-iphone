const PDFDocument = require('pdfkit');

module.exports = async function handler(req,res){
  if(req.method!=='POST'){res.statusCode=405;return res.end('Method Not Allowed')}
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const names=Array.isArray(body.names)?body.names.slice(0,100):[];
    const rows=Array.isArray(body.rows)?body.rows:[];
    const period=body.period||{};
    const doc=new PDFDocument({size:'A4',layout:'portrait',margin:24});
    const chunks=[];doc.on('data',c=>chunks.push(c));
    const done=new Promise((resolve,reject)=>{doc.on('end',resolve);doc.on('error',reject)});
    const W=doc.page.width-48,H=doc.page.height-48,gap=12,cw=(W-gap)/2,ch=(H-gap)/2;
    const safe=s=>String(s??'').replace(/[^\x20-\x7E]/g,'?');
    names.forEach((name,idx)=>{
      if(idx&&idx%4===0)doc.addPage({size:'A4',margin:24});
      const slot=idx%4,col=slot%2,row=Math.floor(slot/2),x=24+col*(cw+gap),y=24+row*(ch+gap);
      doc.rect(x,y,cw,ch).stroke('#9ca3af');
      doc.font('Helvetica-Bold').fontSize(9).text('ZUCCA  ATTENDANCE',x+8,y+8,{width:cw-16});
      doc.font('Helvetica').fontSize(7).text(safe(period.start)+' - '+safe(period.end),x+8,y+20,{width:cw-16,align:'right'});
      doc.font('Helvetica-Bold').fontSize(12).text(safe(name),x+8,y+34,{width:cw-16});
      let yy=y+52;
      doc.font('Helvetica-Bold').fontSize(6).text('DATE     WORK          BREAK  ACTUAL  OT   NIGHT  TRANS',x+8,yy,{width:cw-16});yy+=10;
      const rs=rows.filter(r=>r.name===name);
      let work=0,br=0,ot=0,night=0,trans=0;
      rs.slice(0,31).forEach(r=>{work+=Number(r.workTime)||0;br+=Number(r.breakTime)||0;ot+=Number(r.overtime)||0;night+=Number(r.nightTime)||0;trans+=Number(r.transport)||0;const line=safe(String(r.date||'').slice(5))+'  '+safe(r.inTime||'--')+'-'+safe(r.outTime||'--')+'   '+brNum(r.breakTime)+'   '+brNum(r.workTime)+'   '+brNum(r.overtime)+'   '+brNum(r.nightTime)+'   '+String(Number(r.transport)||0);doc.font('Helvetica').fontSize(5.7).text(line,x+8,yy,{width:cw-16});yy+=8});
      doc.moveTo(x+8,y+ch-26).lineTo(x+cw-8,y+ch-26).stroke('#9ca3af');
      doc.font('Helvetica-Bold').fontSize(6).text('TOTAL  BREAK '+br.toFixed(2)+'  ACTUAL '+work.toFixed(2)+'  OT '+ot.toFixed(2)+'  NIGHT '+night.toFixed(2)+'  TRANS '+trans,x+8,y+ch-20,{width:cw-16});
    });
    doc.end();await done;
    const pdf=Buffer.concat(chunks);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','inline; filename="ZUCCA-attendance.pdf"');
    res.setHeader('Cache-Control','no-store');
    res.statusCode=200;res.end(pdf);
  }catch(e){res.statusCode=500;res.end('PDF generation failed')}
}
function brNum(v){return (Number(v)||0).toFixed(2)}

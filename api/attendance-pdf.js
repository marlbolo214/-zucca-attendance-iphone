const PDFDocument = require('pdfkit');

module.exports = async function handler(req,res){
  if(req.method!=='POST'){res.statusCode=405;return res.end('Method Not Allowed')}
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const names=Array.isArray(body.names)?body.names.slice(0,100):[];
    const rows=Array.isArray(body.rows)?body.rows:[];
    const payroll=body.payroll||{},period=body.period||{};
    const doc=new PDFDocument({size:'A4',layout:'portrait',margin:26});
    const chunks=[];doc.on('data',c=>chunks.push(c));
    const done=new Promise((resolve,reject)=>{doc.on('end',resolve);doc.on('error',reject)});
    const safe=s=>String(s??'').replace(/[^\x20-\x7E]/g,'?');
    const money=v=>'Y'+Math.round(Number(v)||0).toLocaleString('en-US');
    const hours=v=>(Number(v)||0).toFixed(2);

    names.forEach((name,idx)=>{
      if(idx)doc.addPage({size:'A4',margin:26});
      const p=payroll[name]||{},rs=rows.filter(r=>r.name===name&&r.inTime&&r.inTime!=='--').slice(0,31);
      const x=26,w=doc.page.width-52;
      doc.font('Helvetica-Bold').fontSize(12).text('ZUCCA  PAYROLL / ATTENDANCE',x,26,{width:w});
      doc.font('Helvetica').fontSize(7).text(safe(period.start)+' - '+safe(period.end),x,28,{width:w,align:'right'});
      doc.moveTo(x,43).lineTo(x+w,43).stroke('#9ca3af');
      doc.font('Helvetica-Bold').fontSize(15).text(safe(name),x,50,{width:w});
      doc.font('Helvetica').fontSize(7).text('Worked days: '+(p.days||rs.length),x,68,{width:w});

      const boxes=[
        ['RATE',money(p.rate)],['WORK',hours(p.work)],['BREAK',hours(p.breakTime)],
        ['OT',hours(p.overtime)],['NIGHT',hours(p.night)],['BASE',money(p.base)],
        ['OT +25%',money(p.overtimePremium)],['NIGHT +25%',money(p.nightPremium)],
        ['TRANS',money(p.transport)],['TOTAL',money(p.total)]
      ];
      const cols=5,bw=w/cols,bh=31,top=82;
      boxes.forEach((b,i)=>{
        const col=i%cols,row=Math.floor(i/cols),bx=x+col*bw,by=top+row*bh;
        doc.rect(bx,by,bw,bh).stroke('#d1d5db');
        doc.font('Helvetica').fontSize(5.8).fillColor('#6b7280').text(b[0],bx+4,by+5,{width:bw-8});
        doc.font('Helvetica-Bold').fontSize(i===9?9:8).fillColor('#111827').text(b[1],bx+4,by+15,{width:bw-8});
      });

      let yy=top+bh*2+15;
      doc.font('Helvetica-Bold').fontSize(8).text('WORKED DAYS ONLY',x,yy,{width:w});yy+=14;
      const widths=[48,76,55,55,55,55,66],heads=['DATE','IN-OUT','BREAK','WORK','OT','NIGHT','TRANS'];
      let xx=x;heads.forEach((h,i)=>{doc.rect(xx,yy,widths[i],16).fillAndStroke('#f3f4f6','#d1d5db');doc.fillColor('#111827').font('Helvetica-Bold').fontSize(6).text(h,xx+2,yy+5,{width:widths[i]-4,align:'center'});xx+=widths[i]});yy+=16;
      let tw=0,tb=0,to=0,tn=0,tt=0;
      rs.forEach(r=>{
        const vals=[safe(String(r.date||'').slice(5)),safe(r.inTime||'--')+'-'+safe(r.outTime||'--'),hours(r.breakTime),hours(r.workTime),hours(r.overtime),hours(r.nightTime),money(r.transport)];
        tw+=Number(r.workTime)||0;tb+=Number(r.breakTime)||0;to+=Number(r.overtime)||0;tn+=Number(r.nightTime)||0;tt+=Number(r.transport)||0;
        xx=x;vals.forEach((v,i)=>{doc.rect(xx,yy,widths[i],15).stroke('#e5e7eb');doc.font('Helvetica').fontSize(6.4).text(v,xx+2,yy+4,{width:widths[i]-4,align:'center'});xx+=widths[i]});yy+=15;
      });
      if(!rs.length){doc.rect(x,yy,w,20).stroke('#e5e7eb');doc.font('Helvetica').fontSize(7).text('No worked days',x,yy+6,{width:w,align:'center'});yy+=20}
      const vals=['TOTAL','',hours(tb),hours(tw),hours(to),hours(tn),money(tt)];xx=x;
      vals.forEach((v,i)=>{doc.rect(xx,yy,widths[i],17).fillAndStroke('#f9fafb','#9ca3af');doc.fillColor('#111827').font('Helvetica-Bold').fontSize(6.4).text(v,xx+2,yy+5,{width:widths[i]-4,align:'center'});xx+=widths[i]});
      doc.font('Helvetica').fontSize(6).fillColor('#6b7280').text('One employee per A4 page / only days with attendance are listed.',x,doc.page.height-38,{width:w,align:'center'});
    });
    doc.end();await done;
    const pdf=Buffer.concat(chunks);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','inline; filename="ZUCCA-payroll-attendance.pdf"');
    res.setHeader('Cache-Control','no-store');
    res.statusCode=200;res.end(pdf);
  }catch(e){console.error(e);res.statusCode=500;res.end('PDF generation failed')}
};
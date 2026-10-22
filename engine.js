/* Reconstructed from source workbook. No prices are fabricated for missing mappings. */
(function(root){
const up=x=>Math.ceil((x-1e-9)*100)/100;
function zone(data,key,country){const z=data.zones[key]?.[country]||[];return z.length===1?z[0]:null;}
function lookup(data,key,z,weight){const t=data.rates[key];if(!t||z==null)return null;const c=t.zones.indexOf(String(z));if(c<0)return null;const r=t.rows.find(r=>r[0]>=weight);return r&&typeof r[c+1]==='number'?{price:r[c+1],tier:r[0]}:null;}
function split(data,key,z,w,limit){const full=Math.floor((Math.ceil(w)-1)/limit),rest=Math.ceil(w)-full*limit;const a=lookup(data,key,z,limit),b=lookup(data,key,z,rest);if(!b||(full&&!a))return null;return {price:full*(a?.price||0)+b.price,tier:b.tier,full,rest};}
function autoRegion(regions,country,postal){
 const text=postal.trim().toUpperCase(),digits=text.replace(/[\s-]/g,'');if(!text)return null;
 const exact=regions.filter(r=>r.label.trim().toUpperCase()===text);if(exact.length===1)return exact[0];
 if(regions.length===1&&regions[0].label===country)return regions[0];
 const hits=regions.filter(r=>{
  let label=r.label.trim();if(country==='Deutschland')return /^\d{2,5}$/.test(digits)&&String(label).padStart(2,'0')===digits.slice(0,2);
  if(country==='Großbritannien'||country==='Irland'||country==='Bosnien'||country==='Kroatien'||country==='Serbien'||country==='Montenegro'||country==='Mazedonien'||country==='Baltikum')return false;
  if(country==='Türkei')return /^\d{2,5}$/.test(digits)&&label.padStart(2,'0')===digits.slice(0,2);
  if(!/^[\d\s,|/\-]+$/.test(label))return false;
  const tokens=label.split(/[,|/]/).map(x=>x.trim()).filter(Boolean);
  return tokens.some(token=>{const m=token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!m||!/^\d+$/.test(digits))return false;const width=m[1].length;if(digits.length<width)return false;const p=Number(digits.slice(0,width));return p>=Number(m[1])&&p<=Number(m[2]||m[1]);});
 });return hits.length===1?hits[0]:null;
}
function calculate(data,{mode,country,weight,region}){
 if(!Number.isFinite(weight)||weight<=0||weight>100000)throw new Error('Bitte ein Gewicht zwischen 0 und 100.000 kg eingeben.');
 const results=[];const missing=(name,reason)=>results.push({name,price:null,reason});
 const rows=data.schmidt[mode].filter(r=>r[0]===country);const limit=mode==='Export'?3000:5000;
 if(weight>limit)missing('Spedition Schmidt','Tagespreis anfragen: über '+limit.toLocaleString('de-DE')+' kg.');
 else if(!rows.length)missing('Spedition Schmidt','Kein Tarif für dieses Land hinterlegt.');
 else if(!region)missing('Spedition Schmidt','Bitte das passende PLZ-Gebiet bzw. den Empfangsort auswählen.');
 else{
  const matches=rows.filter(r=>r[1]===String(region.zone)&&r[2]>=weight).sort((a,b)=>a[2]-b[2]);const r=matches[0];
  if(!r)missing('Spedition Schmidt','Keine passende Gewichtsstufe für diese Zone hinterlegt.');
  else{
   const same=matches.filter(v=>v[2]===r[2]);if(same.some(v=>v[3]!==r[3]||v[4]!==r[4]))missing('Spedition Schmidt','Widersprüchliche Tarife in der Quelldatei – bitte prüfen.');
   else{const base=r[4]||country==='Deutschland'?r[3]:weight/100*r[3],diesel=base*(mode==='Import'||country==='Deutschland'?.057:.038),maut=country==='Deutschland'?base*.0992:0;
   results.push({name:'Spedition Schmidt',price:up(base+diesel+maut),base,extra:diesel+maut,zone:r[1],tier:r[2],source:'Schmidt '+mode+' Preistabelle',details:[r[4]||country==='Deutschland'?'Pauschaltarif':'Tarif je 100 kg: '+r[3].toLocaleString('de-DE')+' €','Diesel: '+(mode==='Import'||country==='Deutschland'?'5,7':'3,8')+' %',...(maut?['Deutsche Maut: 9,92 %']:[])],gross:mode==='Export'?up((base+diesel+maut)*1.19):null});}
  }
 }
 for(const service of ['Saver','Express','Expedited','Plus']){
  const name='UPS '+({Saver:'Express Saver',Express:'Express',Expedited:'Expedited',Plus:'Express Plus'}[service]);
  if(mode==='Export'&&service==='Plus')continue;
  const key=mode+' '+service,z=zone(data,mode==='Import'?(service==='Expedited'?'Export Expedited':'Import Express'):key,country);
  if(z===null){missing(name,'Keine eindeutige Länderzone hinterlegt.');continue;}
  const b=split(data,key,z,weight,service==='Expedited'?100:70);
  if(!b){missing(name,'Für Zone '+z+' ist kein passender Tarif hinterlegt.');continue;}
  const factor=mode==='Export'?1.33:(service==='Expedited'?1.33:service==='Plus'?1.4:1.4075),fixed=mode==='Import'?19.25:0;
  if(mode==='Import'&&service==='Plus'){
   const intermediate=up(b.price*factor)+fixed,total=intermediate*1.35;
   results.push({name,price:up(total),base:b.price,extra:total-b.price,zone:z,tier:b.tier,source:'Import Express Plus Tarife',details:['Excel: (Tarif × 1,40, aufgerundet + 19,25 €) × 1,35','Gewicht auf volle kg aufgerundet; Aufteilung in 70-kg-Blöcke']});
  }else results.push({name,price:mode==='Import'?up(b.price*factor)+fixed:up(b.price*factor),base:b.price,extra:b.price*(factor-1)+fixed,zone:z,tier:b.tier,source:({Saver:mode+' Express Saver',Express:mode==='Export'?'ExpressTarife':'Import Express',Expedited:mode==='Export'?'Preistabelle Export Expedited':'Import Expedited'})[service],details:['Tarif × '+factor.toLocaleString('de-DE',{maximumFractionDigits:4})+(fixed?' + 19,25 €':''),'Gewicht auf volle kg aufgerundet; '+(service==='Expedited'?100:70)+'-kg-Blöcke',...(mode==='Import'&&service==='Expedited'?['Länderzone aus „Expedited Landzonen“; gemischten Import-/Exportbezug bereinigt.']:[])]});
 }
 if(mode==='Import'){
  if(weight>70)missing('UPS Standard Single','Maximal 70 kg und ein Packstück.');
  else{const records=data.single.filter(r=>r[0]===country&&r[2]>=weight).sort((a,b)=>a[2]-b[2]),r=records[0];if(r)results.push({name:'UPS Standard Single',price:up(r[3]*1.22),base:r[3],extra:r[3]*.22,zone:r[1],tier:r[2],source:'Import Std Single',details:['Ein Packstück; Faktor 1,22 gemäß Import-Tabelle']});else missing('UPS Standard Single','Kein passender Tarif hinterlegt.');}
  missing('UPS Standard Multi','Excel-Formel widersprüchlich (200-/2.000-kg-Aufteilung). Preis muss geprüft werden.');
 }else for(const service of ['Standard','Plus']){
  const key='Export '+service,name=service==='Plus'?'UPS Express Plus':'UPS Standard',z=zone(data,key,country);
  if(!z){missing(name,'Keine eindeutige Länderzone hinterlegt.');continue;}
  if(weight>=30||!(Number.isInteger(weight)||weight===.5)){missing(name,'Gewichtsaufteilung der Excel-Formel prüfen. Verlässlich übernommen für 0,5 kg oder volle kg unter 30 kg.');continue;}
  const b=lookup(data,key,z,weight);if(!b){missing(name,'Kein Tarif hinterlegt.');continue;}
  const fuel=up(b.price*(service==='Standard'?.154:.31));results.push({name,price:up(b.price+fuel),base:b.price,extra:fuel,zone:z,tier:b.tier,source:service==='Standard'?'StandardTarife':'ExpressPlusTarife',details:['Treibstoffzuschlag: '+(service==='Standard'?'15,4':'31')+' %','Ein Paket; Gewichtsbereich ohne widersprüchliche Aufteilung']});
 }
 return results.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
}
const api={calculate,autoRegion,lookup,split,up};if(typeof module!=='undefined')module.exports=api;else root.TransportEngine=api;
})(typeof window!=='undefined'?window:globalThis);

const $=id=>document.getElementById(id),eur=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(v),esc=v=>String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));let data,regions=[];
const mode=()=>document.querySelector('input[name=mode]:checked').value;
function tariffDescription(name){
 const exp=mode()==='Export';
 const descriptions={
  'Spedition Schmidt': ['Lieferzeit in der Excel-Datei nicht angegeben.', 'Über '+(exp?'3.000':'5.000')+' kg: aktuellen Tagespreis anfragen.'],
  'UPS Standard': ['Maximal 70 kg und nur 1 Packstück.', '2–3 Werktage Europa.'],
  'UPS Standard Single': ['Maximal 70 kg und nur 1 Packstück.', '2–3 Werktage Europa.'],
  'UPS Standard Multi': ['Mehr als 1 Packstück.', '2–3 Werktage EU.'],
  'UPS Express Saver': [exp?'Bis zum Ende des nächsten Werktags für die EU.':'Bis 18:30 Uhr am nächsten Werktag.'],
  'UPS Express': exp?['1 Werktag Europa · 2 Werktage USA.', 'Asien: bis zum Ende des 4. Werktags.']:['Vor 12:00 Uhr am nächsten Werktag.'],
  'UPS Expedited': ['Internationale Sendungen: 3–5 Werktage.'],
  'UPS Express Plus': ['Europa, USA und Kanada: '+(exp?'bis':'vor')+' 9:00 Uhr am nächsten Werktag.', 'Asien: '+(exp?'bis':'vor')+' 9:00 Uhr am zweiten Werktag.']
 };
 return '<div class="tariff-description">'+(descriptions[name]||['Lieferzeit in der Excel-Datei nicht angegeben.']).map(line=>'<p>'+esc(line)+'</p>').join('')+'</div>';
}
function updateRegions(){
 regions=data.regions[mode()][$('country').value.trim()]||[];$('region').innerHTML='<option value="">Automatisch / bitte wählen</option>'+regions.map((r,i)=>`<option value="${i}">${esc(r.label)} · Zone ${esc(r.zone)}</option>`).join('');
 $('region-wrap').hidden=!regions.length;autoselect();$('direction-note').textContent=mode()==='Export'?'Von Deutschland ins Zielland':'Vom ausgewählten Land nach Deutschland';
}
function autoselect(){const hit=TransportEngine.autoRegion(regions,$('country').value.trim(),$('postal').value);$('region').value=hit?String(regions.indexOf(hit)):'';$('region-hint').textContent=hit?'PLZ-Gebiet automatisch erkannt.':'Falls keine eindeutige Zuordnung möglich ist, Originalgebiet oder Empfangsort auswählen.';}
function stale(){if($('summary').textContent){$('pending').hidden=false;$('results').classList.add('stale');$('print').disabled=true;}}
function run(){
 $('error').textContent='';const country=$('country').value.trim(),weight=Number($('weight').value.trim().replace(',','.'));
 if(!data.countries.includes(country)){$('error').textContent='Bitte ein Land aus der Liste auswählen.';return;}
 try{
 const region=$('region').value!==''?regions[Number($('region').value)]:null,input={mode:mode(),country,weight,region};const results=TransportEngine.calculate(data,input),valid=results.filter(r=>r.price!==null),invalid=results.filter(r=>r.price===null);
 $('summary').innerHTML=`<span><strong>${esc(input.mode)}</strong></span><span>${esc(country)}</span><span>PLZ / Ort: ${esc($('postal').value||'–')}</span><span><strong>${weight.toLocaleString('de-DE')} kg</strong></span><span>${valid.length} Tarife</span>`;
 $('results').innerHTML=(valid.length?valid.map((r,i)=>`<article class="card ${i===0?'best':''}">${i===0?'<span class="best-tag">GÜNSTIGSTER BERECHNETER TARIF</span>':''}<div class="card-main"><div class="service"><span class="carrier-logo ${r.name.startsWith('UPS')?'ups':'schmidt'}"><img src="assets/${r.name.startsWith('UPS')?'ups':'schmidt'}.png" alt="${r.name.startsWith('UPS')?'UPS':'Schmidt'}"></span><div><h3>${esc(r.name)}</h3><p>Zone ${esc(r.zone)} · letzte Teilgewichtsstufe bis ${r.tier} kg</p></div></div><div class="price">${eur(r.price)}<small>Vergleichspreis laut Excel</small></div></div>${tariffDescription(r.name)}<div class="breakdown"><span>Grundtarif <strong>${eur(r.base)}</strong></span><span>Zuschläge <strong>${eur(r.extra)}</strong></span>${r.gross?`<span>inkl. 19 % MwSt. <strong>${eur(r.gross)}</strong></span>`:''}</div><details><summary>Berechnung & Tarifquelle</summary><ul>${r.details.map(d=>`<li>${esc(d)}</li>`).join('')}</ul><p>Quelle: ${esc(r.source)}</p></details></article>`).join(''):'<div class="empty">Für diese Eingaben ist kein verlässlich berechenbarer Tarif verfügbar. Prüfe bei Schmidt das PLZ-Gebiet oder frage den Tagespreis an.</div>')+(invalid.length?`<details class="unavailable" ${valid.length?'':'open'}><summary>${invalid.length} weitere Dienste: nicht verfügbar / zu prüfen</summary>${invalid.map(r=>`<div class="unavailable-row"><div class="unavailable-service"><b>${esc(r.name)}</b>${tariffDescription(r.name)}</div><span>${esc(r.reason)}</span></div>`).join('')}</details>`:'');
 $('pending').hidden=true;$('results').classList.remove('stale');$('print').disabled=false;
 }catch(e){$('error').textContent=e.message;}
}
fetch('data.json').then(r=>{if(!r.ok)throw Error('Tarifdaten konnten nicht geladen werden.');return r.json();}).then(d=>{data=d;$('country').innerHTML=d.countries.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');$('country').value='Deutschland';updateRegions();run();}).catch(e=>{$('error').textContent=e.message;$('form').querySelector('button').disabled=true;});
$('form').addEventListener('submit',e=>{e.preventDefault();if(data)run();});$('country').addEventListener('change',()=>{if(data){updateRegions();stale();}});$('postal').addEventListener('input',()=>{if(data){autoselect();stale();}});$('weight').addEventListener('input',stale);$('region').addEventListener('change',stale);document.querySelectorAll('input[name=mode]').forEach(el=>el.addEventListener('change',()=>{if(data){updateRegions();stale();}}));$('print').addEventListener('click',()=>window.print());

import {useMemo,useState} from 'react';
import {Info,Search,ShieldCheck,Wrench} from 'lucide-react';

type Row=string[];
const hex:Row[]=[
 ['M6','10','10','Small brackets and equipment fittings'],['M8','13','13','General equipment fasteners'],
 ['M10','16','17','Check bolt/nut standard'],['M12','18','19','Common machinery and support fasteners'],
 ['M14','21','22','Confirm the actual head size'],['M16','24','24','Common structural and equipment fasteners'],
 ['M18','27','27','Verify the applicable standard'],['M20','30','30','Common larger fasteners'],
 ['M22','34','32','Standard differences matter'],['M24','36','36','Large equipment / structural fasteners'],
 ['M27','41','41','Confirm the actual head and nut'],['M30','46','46','Large fasteners'],['M36','55','55','Large fasteners; use approved tooling'],
];
const allen:Row[]=[['M2','1.5'],['M2.5','2'],['M3','2.5'],['M4','3'],['M5','4'],['M6','5'],['M8','6'],['M10','8'],['M12','10'],['M14','12'],['M16','14'],['M20','17'],['M24','19']];
const headStyles:Row[]=[
 ['M3','2.5','2.5','2','2','1.5'],['M4','3','2.5','2.5','2.5','2'],['M5','4','3','3','3','2.5'],
 ['M6','5','4','4','4','3'],['M8','6','5','5','5','4'],['M10','8','7','6','6','5'],
 ['M12','10','8','8','8','6'],['M16','14','12','10','10','—'],
];
const tabs=[
 {id:'hex',label:'Hex bolt / nut AF',title:'Metric hex bolt and nut · spanner / socket AF',desc:'Common current ISO A/F sizes, with older DIN dimensions where the reference note identifies a difference.',heads:['THREAD','ISO AF','OLDER DIN','COMMON USE / NOTE'],rows:hex},
 {id:'allen',label:'Allen key by thread',title:'Allen key sizes · socket-head cap screw',desc:'Typical metric sizes for DIN 912 / ISO 4762 socket-head cap screws.',heads:['SCREW THREAD','ALLEN KEY SIZE'],rows:allen},
 {id:'head',label:'Allen key by head style',title:'Allen key size changes with screw head style',desc:'The same thread size can need a different hex key for low-head, button, countersunk and set screws.',heads:['THREAD','SOCKET CAP · ISO 4762','LOW HEAD · DIN 7984','BUTTON · ISO 7380','COUNTERSUNK · ISO 10642','SET SCREW · ISO 4029'],rows:headStyles},
];
export default function FastenerReference(){const [active,setActive]=useState('hex');const [query,setQuery]=useState('');const current=tabs.find(x=>x.id===active)!;const rows=useMemo(()=>current.rows.filter(row=>row.join(' ').toLowerCase().includes(query.toLowerCase())),[current,query]);return <div className="content page-content fastener-reference"><div className="page-heading"><div className="eyebrow">WORKSHOP REFERENCE · FIELD TOOLING</div><h1>Bolt, Spanner & Allen Key Reference</h1><p>Choose the correct tool by fastener type and head style. Thread diameter and tool size are different measurements.</p></div>
  <div className="fastener-warning"><Info size={17}/><span><b>Reference sizes only.</b> Confirm the installed fastener, equipment manual, approved drawing and applicable standard before applying torque. ISO and older DIN patterns can differ.</span></div>
  <section className="panel fastener-table-panel"><div className="panel-top"><div><h2>{current.title}</h2><p>{current.desc}</p></div><label className="table-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find M12, M16…" aria-label="Search fastener sizes"/></label></div>
   <div className="dimension-tabs">{tabs.map(t=><button key={t.id} className={active===t.id?'selected':''} onClick={()=>{setActive(t.id);setQuery('')}}>{t.label}</button>)}</div>
   <div className="table-wrap"><table><thead><tr>{current.heads.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row[0]}><td><b>{row[0]}</b></td>{row.slice(1).map((cell,j)=><td key={j}>{cell}{active==='head'&&cell!=='—'?' mm':active==='allen'?' mm':j<2?' mm':''}</td>)}</tr>)}{rows.length===0&&<tr><td colSpan={current.heads.length} className="no-results">No matching fastener sizes.</td></tr>}</tbody></table></div>
   <div className="table-foot"><Info size={14}/><span><b>A/F means across flats.</b> A matching spanner or Allen key does not confirm thread pitch or fastener grade.</span></div>
  </section>
  <div className="fastener-lower-grid"><section className="panel fastener-guidance"><h3><Wrench size={16}/> Fastener identification in the field</h3><ol><li>Identify whether it is a hex-head bolt/nut or socket-head screw.</li><li>Check markings, drawing, equipment manual and specified standard.</li><li>Seat the spanner/socket snugly across flats; seat the hex key fully in the recess.</li><li>If the tool rocks or engages only at the corners, stop and re-check the size and condition.</li><li>For critical joints, use the approved tightening sequence and calibrated torque tool.</li></ol></section>
   <section className="panel fastener-safety"><h3><ShieldCheck size={16}/> Important maintenance notes</h3><ul><li>Apply site PTW / LOTO and verify safe isolation before loosening equipment fasteners.</li><li>Follow the unit procedure for hot, pressurised, chemical or rotating equipment.</li><li>Inspect for rounded, cracked, corroded or damaged fasteners and tooling.</li><li>This chart does not establish bolt grade, thread pitch, tightening torque or pressure-boundary suitability.</li></ul></section></div>
 </div>}

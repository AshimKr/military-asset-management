import {useEffect,useMemo,useState} from 'react';
import {api} from '../api/client';
import Filters from '../components/Filters';
import Modal from '../components/Modal';

const today=new Date();const first=new Date(today.getFullYear(),today.getMonth(),1);const iso=d=>d.toISOString().slice(0,10);
export default function Dashboard(){
  const [filters,setFilters]=useState({from:iso(first),to:iso(today),baseId:'',equipmentTypeId:''});
  const [bases,setBases]=useState([]),[equipment,setEquipment]=useState([]),[metrics,setMetrics]=useState(null),[movements,setMovements]=useState(null),[error,setError]=useState('');
  const params=useMemo(()=>Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=='')),[filters]);
  useEffect(()=>{Promise.all([api.get('/meta/bases'),api.get('/meta/equipment-types')]).then(([b,e])=>{setBases(b.data);setEquipment(e.data)})},[]);
  useEffect(()=>{setError('');api.get('/dashboard',{params}).then(r=>setMetrics(r.data)).catch(e=>setError(e.response?.data?.error||'Unable to load dashboard'))},[params]);
  const openMovements=async()=>{const {data}=await api.get('/dashboard/movements',{params});setMovements(data)};
  return <section><div className="page-head"><div><h1>Dashboard</h1><p>Inventory position and period movement summary.</p></div></div><Filters {...{filters,setFilters,bases,equipment}}/>{error&&<div className="error">{error}</div>}
    <div className="metrics">
      <Metric title="Opening Balance" value={metrics?.openingBalance}/>
      <button className="metric clickable" onClick={openMovements}><span>Net Movement</span><strong>{metrics?.netMovement??'—'}</strong><small>Purchases + In − Out · View details</small></button>
      <Metric title="Closing Balance" value={metrics?.closingBalance}/><Metric title="Assigned" value={metrics?.assigned}/><Metric title="Expended" value={metrics?.expended}/>
    </div>
    <div className="card"><h3>Movement composition</h3><div className="summary-grid"><div><span>Purchases</span><strong>{metrics?.purchases??'—'}</strong></div><div><span>Transfer In</span><strong>{metrics?.transferIn??'—'}</strong></div><div><span>Transfer Out</span><strong>{metrics?.transferOut??'—'}</strong></div></div></div>
    {movements&&<Modal title="Net Movement Details" onClose={()=>setMovements(null)}><div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Base</th><th>Equipment</th><th>Qty</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td>{new Date(m.occurredAt).toLocaleString()}</td><td>{m.eventType.replaceAll('_',' ')}</td><td>{m.baseName}</td><td>{m.equipmentName}</td><td>{m.quantity}</td></tr>)}</tbody></table></div></Modal>}
  </section>
}
function Metric({title,value}){return <div className="metric"><span>{title}</span><strong>{value??'—'}</strong></div>}

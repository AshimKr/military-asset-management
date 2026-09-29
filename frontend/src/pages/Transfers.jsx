import {useEffect,useMemo,useState} from 'react';
import {api} from '../api/client';
import {useAuth} from '../auth/AuthContext';

export default function Transfers(){
  const {user}=useAuth();
  const [sourceBases,setSourceBases]=useState([]),[transferBases,setTransferBases]=useState([]),[equipment,setEquipment]=useState([]),[rows,setRows]=useState([]),[error,setError]=useState('');
  const [filters,setFilters]=useState({from:'',to:'',equipmentTypeId:''});
  const [form,setForm]=useState({fromBaseId:user.baseId||'',toBaseId:'',equipmentTypeId:'',quantity:1,notes:''});
  const params=useMemo(()=>Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=='')),[filters]);
  const load=()=>api.get('/transfers',{params}).then(r=>setRows(r.data));

  useEffect(()=>{
    Promise.all([api.get('/meta/bases'),api.get('/meta/transfer-bases'),api.get('/meta/equipment-types')]).then(([b,t,e])=>{
      setSourceBases(b.data);setTransferBases(t.data);setEquipment(e.data);
      if(!form.fromBaseId&&b.data[0])setForm(f=>({...f,fromBaseId:b.data[0].id}));
    });
  },[]);
  useEffect(()=>{load()},[params]);

  const submit=async e=>{
    e.preventDefault();setError('');
    try{
      await api.post('/transfers',{...form,fromBaseId:Number(form.fromBaseId),toBaseId:Number(form.toBaseId),equipmentTypeId:Number(form.equipmentTypeId),quantity:Number(form.quantity)});
      await load();setForm(f=>({...f,toBaseId:'',quantity:1,notes:''}));
    }catch(x){setError(x.response?.data?.error||'Failed')}
  };

  return <section>
    <div className="page-head"><div><h1>Transfers</h1><p>Move available inventory between bases with an auditable double-entry ledger.</p></div></div>
    {error&&<div className="error">{error}</div>}
    <form className="card form-grid" onSubmit={submit}>
      <label>From base<select required value={form.fromBaseId} onChange={e=>setForm({...form,fromBaseId:e.target.value})}>{sourceBases.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>To base<select required value={form.toBaseId} onChange={e=>setForm({...form,toBaseId:e.target.value})}><option value="">Select destination</option>{transferBases.filter(b=>String(b.id)!==String(form.fromBaseId)).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>Equipment<select required value={form.equipmentTypeId} onChange={e=>setForm({...form,equipmentTypeId:e.target.value})}><option value="">Select</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Quantity<input min="1" type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label>
      <label className="span-2">Notes<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      <button className="primary">Record transfer</button>
    </form>
    <div className="card filters purchase-filters">
      <label>History from<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
      <label>History to<input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      <label>Equipment type<select value={filters.equipmentTypeId} onChange={e=>setFilters({...filters,equipmentTypeId:e.target.value})}><option value="">All equipment</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    </div>
    <div className="card table-wrap"><table><thead><tr><th>Timestamp</th><th>From</th><th>To</th><th>Equipment</th><th>Qty</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.transferredAt).toLocaleString()}</td><td>{r.fromBaseName}</td><td>{r.toBaseName}</td><td>{r.equipmentName}</td><td>{r.quantity}</td></tr>)}</tbody></table></div>
  </section>
}

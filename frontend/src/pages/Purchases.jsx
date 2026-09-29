import {useEffect,useMemo,useState} from 'react';
import {api} from '../api/client';
import {useAuth} from '../auth/AuthContext';

export default function Purchases(){
  const {user}=useAuth();
  const [bases,setBases]=useState([]),[equipment,setEquipment]=useState([]),[rows,setRows]=useState([]),[error,setError]=useState('');
  const [filters,setFilters]=useState({from:'',to:'',equipmentTypeId:''});
  const [form,setForm]=useState({baseId:user.baseId||'',equipmentTypeId:'',quantity:1,purchaseDate:new Date().toISOString().slice(0,10),supplierReference:'',notes:''});
  const params=useMemo(()=>Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=='')),[filters]);
  const load=()=>api.get('/purchases',{params}).then(r=>setRows(r.data));

  useEffect(()=>{
    Promise.all([api.get('/meta/bases'),api.get('/meta/equipment-types')]).then(([b,e])=>{
      setBases(b.data);setEquipment(e.data);
      if(!form.baseId&&b.data[0])setForm(f=>({...f,baseId:b.data[0].id}));
    });
  },[]);
  useEffect(()=>{load()},[params]);

  const submit=async e=>{
    e.preventDefault();setError('');
    try{
      await api.post('/purchases',{...form,baseId:Number(form.baseId),equipmentTypeId:Number(form.equipmentTypeId),quantity:Number(form.quantity)});
      await load();setForm(f=>({...f,quantity:1,supplierReference:'',notes:''}));
    }catch(x){setError(x.response?.data?.error||'Failed')}
  };

  return <section>
    <div className="page-head"><div><h1>Purchases</h1><p>Record receipts and review purchase history.</p></div></div>
    {error&&<div className="error">{error}</div>}
    <form className="card form-grid" onSubmit={submit}>
      <label>Base<select required value={form.baseId} onChange={e=>setForm({...form,baseId:e.target.value})}>{bases.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>Equipment<select required value={form.equipmentTypeId} onChange={e=>setForm({...form,equipmentTypeId:e.target.value})}><option value="">Select</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Quantity<input min="1" type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label>
      <label>Purchase date<input type="date" value={form.purchaseDate} onChange={e=>setForm({...form,purchaseDate:e.target.value})}/></label>
      <label>Supplier reference<input value={form.supplierReference} onChange={e=>setForm({...form,supplierReference:e.target.value})}/></label>
      <label>Notes<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      <button className="primary">Record purchase</button>
    </form>
    <div className="card filters purchase-filters">
      <label>History from<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
      <label>History to<input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
      <label>Equipment type<select value={filters.equipmentTypeId} onChange={e=>setFilters({...filters,equipmentTypeId:e.target.value})}><option value="">All equipment</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    </div>
    <Table rows={rows}/>
  </section>
}
function Table({rows}){return <div className="card table-wrap"><table><thead><tr><th>Date</th><th>Base</th><th>Equipment</th><th>Quantity</th><th>Reference</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.purchaseDate}</td><td>{r.baseName}</td><td>{r.equipmentName}</td><td>{r.quantity}</td><td>{r.supplierReference||'—'}</td></tr>)}</tbody></table></div>}

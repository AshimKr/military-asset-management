export default function Filters({filters,setFilters,bases,equipment}){
  return <div className="filters card">
    <label>From<input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></label>
    <label>To<input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></label>
    <label>Base<select value={filters.baseId} onChange={e=>setFilters({...filters,baseId:e.target.value})}><option value="">All accessible bases</option>{bases.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    <label>Equipment<select value={filters.equipmentTypeId} onChange={e=>setFilters({...filters,equipmentTypeId:e.target.value})}><option value="">All equipment</option>{equipment.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
  </div>
}

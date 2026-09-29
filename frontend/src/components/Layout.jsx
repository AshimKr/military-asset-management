import {NavLink,Outlet} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';

export default function Layout(){
  const {user,logout}=useAuth();
  const canDashboard=user.role!=='LOGISTICS_OFFICER';
  const canAssign=user.role!=='LOGISTICS_OFFICER';
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">AM</span><div><strong>Asset Manager</strong><small>Accountability Console</small></div></div>
      <nav>
        {canDashboard&&<NavLink to="/dashboard">Dashboard</NavLink>}
        <NavLink to="/purchases">Purchases</NavLink>
        <NavLink to="/transfers">Transfers</NavLink>
        {canAssign&&<NavLink to="/assignments">Assignments & Expenditures</NavLink>}
      </nav>
      <div className="profile"><div><strong>{user.name}</strong><small>{user.role.replaceAll('_',' ')}</small></div><button className="ghost" onClick={logout}>Sign out</button></div>
    </aside>
    <main className="main"><Outlet/></main>
  </div>
}

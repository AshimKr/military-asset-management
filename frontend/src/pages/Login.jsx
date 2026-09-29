import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';

export default function Login(){
  const [email,setEmail]=useState('admin@example.com');const [password,setPassword]=useState('Admin@12345');const [error,setError]=useState('');
  const {login}=useAuth();const navigate=useNavigate();
  const submit=async e=>{e.preventDefault();setError('');try{const u=await login(email,password);navigate(u.role==='LOGISTICS_OFFICER'?'/purchases':'/dashboard')}catch(err){setError(err.response?.data?.error||'Login failed')}};
  return <div className="login-wrap"><form className="login-card" onSubmit={submit}><div className="brand login-brand"><span className="brand-mark">AM</span><div><strong>Asset Manager</strong><small>Secure logistics workspace</small></div></div><h1>Sign in</h1><p className="muted">Use your authorized account to continue.</p>{error&&<div className="error">{error}</div>}<label>Email<input value={email} onChange={e=>setEmail(e.target.value)} type="email"/></label><label>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password"/></label><button className="primary">Sign in</button></form></div>
}

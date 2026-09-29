import {createContext,useContext,useMemo,useState} from 'react';
import {api} from '../api/client';

const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('user'))}catch{return null}});
  const login=async(email,password)=>{
    const {data}=await api.post('/auth/login',{email,password});
    localStorage.setItem('access_token',data.token);
    localStorage.setItem('user',JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const logout=()=>{localStorage.removeItem('access_token');localStorage.removeItem('user');setUser(null)};
  const value=useMemo(()=>({user,login,logout}),[user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);

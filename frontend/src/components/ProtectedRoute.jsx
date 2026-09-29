import {Navigate} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';
export default function ProtectedRoute({children,roles}){
  const {user}=useAuth();
  if(!user) return <Navigate to="/login" replace/>;
  if(roles && !roles.includes(user.role)) return <Navigate to={user.role==='LOGISTICS_OFFICER'?'/purchases':'/dashboard'} replace/>;
  return children;
}

import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  const forbidden = !!user && roles && !roles.includes(user.role);

  // A silent redirect for a wrong-role visit reads as an unexplained "access
  // denied" — tell the user why instead of just bouncing them to "/".
  useEffect(() => {
    if (forbidden) toast.error("You don't have permission to view that page.");
  }, [forbidden]);

  if (!user) return <Navigate to="/login" replace />;
  if (forbidden) return <Navigate to="/" replace />;
  return children;
};

export default ProtectedRoute;

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import About from './pages/About';
import PublicBooking from './pages/PublicBooking';
import Membership from './pages/Membership';
import Profile from './pages/Profile';

// Member pages
import MemberDashboard from './pages/member/MemberDashboard';
import MemberBooking from './pages/member/MemberBooking';
import MemberMembership from './pages/member/MemberMembership';
import MemberStats from './pages/member/MemberStats';

// Coach pages
import CoachDashboard from './pages/coach/CoachDashboard';
import CoachBooking from './pages/coach/CoachBooking';
import CoachStats from './pages/coach/CoachStats';

// Ball Boy pages
import BallBoyDashboard from './pages/ballboy/BallBoyDashboard';
import BallBoyAssignments from './pages/ballboy/BallBoyAssignments';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBookings from './pages/admin/AdminBookings';
import AdminMembers from './pages/admin/AdminMembers';
import { AdminCoaches, AdminBallBoys } from './pages/admin/AdminCoaches';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import Prediction from './pages/admin/Prediction';
import AdminSchedule from './pages/admin/AdminSchedule';

// Code-split: recharts + the stocks page add real bundle weight, and the
// simulator specifically must never be fetched by non-dev, non-admin users.
const AfricanStocks = lazy(() => import('./pages/stocks/AfricanStocks'));
const MobileSimulator = lazy(() => import('./components/dev/MobileSimulator'));

const PageFallback = () => <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse m-6" />;

// Gated to dev builds or admins only — MobileSimulator's own chunk is never
// fetched for anyone else, so regular production users get no button, no
// code, no DOM trace of it.
const DevToolsGate = () => {
  const { user } = useAuth();
  if (!import.meta.env.DEV && user?.role !== 'admin') return null;
  return (
    <Suspense fallback={null}>
      <MobileSimulator />
    </Suspense>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }}/>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />}/>
            <Route path="/login" element={<Login />}/>
            <Route path="/register" element={<Register />}/>
            <Route path="/forgot-password" element={<ForgotPassword />}/>
            <Route path="/reset-password" element={<ResetPassword />}/>
            <Route path="/about" element={<About />}/>
            <Route path="/booking" element={<PublicBooking />}/>
            <Route path="/membership" element={<Membership />}/>

            {/* Member */}
            <Route path="/member" element={<ProtectedRoute roles={['member']}><MemberDashboard/></ProtectedRoute>}/>
            <Route path="/member/book" element={<ProtectedRoute roles={['member']}><MemberBooking/></ProtectedRoute>}/>
            <Route path="/member/membership" element={<ProtectedRoute roles={['member']}><MemberMembership/></ProtectedRoute>}/>
            <Route path="/member/stats" element={<ProtectedRoute roles={['member']}><MemberStats/></ProtectedRoute>}/>

            {/* Coach */}
            <Route path="/coach" element={<ProtectedRoute roles={['coach']}><CoachDashboard/></ProtectedRoute>}/>
            <Route path="/coach/book" element={<ProtectedRoute roles={['coach']}><CoachBooking/></ProtectedRoute>}/>
            <Route path="/coach/stats" element={<ProtectedRoute roles={['coach']}><CoachStats/></ProtectedRoute>}/>

            {/* Ball Boy */}
            <Route path="/ballboy" element={<ProtectedRoute roles={['ballboy']}><BallBoyDashboard/></ProtectedRoute>}/>
            <Route path="/ballboy/assignments" element={<ProtectedRoute roles={['ballboy']}><BallBoyAssignments/></ProtectedRoute>}/>
            <Route path="/ballboy/courts" element={<ProtectedRoute roles={['ballboy']}><BallBoyDashboard/></ProtectedRoute>}/>

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard/></ProtectedRoute>}/>
            <Route path="/admin/bookings" element={<ProtectedRoute roles={['admin']}><AdminBookings/></ProtectedRoute>}/>
            <Route path="/admin/members" element={<ProtectedRoute roles={['admin']}><AdminMembers/></ProtectedRoute>}/>
            <Route path="/admin/coaches" element={<ProtectedRoute roles={['admin']}><AdminCoaches/></ProtectedRoute>}/>
            <Route path="/admin/ballboys" element={<ProtectedRoute roles={['admin']}><AdminBallBoys/></ProtectedRoute>}/>
            <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><AdminAnalytics/></ProtectedRoute>}/>
            <Route path="/admin/predictions" element={<ProtectedRoute roles={['admin']}><Prediction/></ProtectedRoute>}/>
            <Route path="/admin/schedule" element={<ProtectedRoute roles={['admin']}><AdminSchedule/></ProtectedRoute>}/>

            {/* Shared profile page — member & coach */}
            <Route path="/profile" element={<ProtectedRoute roles={['member','coach']}><Profile/></ProtectedRoute>}/>

            {/* African Stocks — visible to every logged-in role */}
            <Route path="/stocks" element={
              <ProtectedRoute roles={['member','coach','ballboy','admin']}>
                <Suspense fallback={<PageFallback/>}><AfricanStocks/></Suspense>
              </ProtectedRoute>
            }/>

            <Route path="*" element={<Navigate to="/" replace/>}/>
          </Routes>
          <DevToolsGate/>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

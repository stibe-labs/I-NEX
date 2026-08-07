import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Users, BookOpen, LogOut, Settings, Menu, X } from 'lucide-react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import BranchDashboard from './pages/BranchDashboard';
import CustomerDetails from './pages/CustomerDetails';
import DayBook from './pages/DayBook';
import TeamManagement from './pages/TeamManagement';
import './index.css';

// Simple mockup of auth state for UI flow
const AuthContext = React.createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(() => {
    const savedRole = localStorage.getItem('inex_user_role');
    const savedName = localStorage.getItem('inex_user_name');
    return savedRole ? { role: savedRole, name: savedName } : null;
  });

  const login = (role, name) => {
    // role: 'admin' or 'branch'
    localStorage.setItem('inex_user_role', role);
    if(name) localStorage.setItem('inex_user_name', name);
    setUser({ role, name });
  };

  const logout = () => {
    localStorage.removeItem('inex_user_role');
    localStorage.removeItem('inex_user_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const Layout = ({ children }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isActive = (path) => location.pathname === path ? 'active' : '';
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div>
      <nav className="navbar">
        <div className="nav-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/INEX final logo-04.png" alt="I-NEX Logo" style={{ height: '32px' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem', padding: '0.2rem 0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '10px' }}>
              {user?.role === 'admin' ? 'Admin Portal' : 'Branch Portal'}
            </span>
          </div>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link to="/" onClick={closeMenu} className={`nav-link ${isActive('/')}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link to="/customers" onClick={closeMenu} className={`nav-link ${isActive('/customers')}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} /> Customers
          </Link>
          <Link to="/daybook" onClick={closeMenu} className={`nav-link ${isActive('/daybook')}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={18} /> Day Book
          </Link>
          {user?.role === 'admin' && (
            <Link to="/team" onClick={closeMenu} className={`nav-link ${isActive('/team')}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} /> Team
            </Link>
          )}
          <button onClick={() => { closeMenu(); logout(); }} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
};

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminDashboard />;
  if (user?.role === 'branch') return <BranchDashboard />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            padding: '1rem 1.5rem',
          }
        }} 
      />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout><DashboardRouter /></Layout></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><Layout><CustomerDetails /></Layout></ProtectedRoute>} />
          <Route path="/daybook" element={<ProtectedRoute><Layout><DayBook /></Layout></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute allowedRoles={['admin']}><Layout><TeamManagement /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

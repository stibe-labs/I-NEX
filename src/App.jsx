import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Users, BookOpen, LogOut, Settings, Menu, X, Package, DollarSign, ShoppingCart, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import BranchDashboard from './pages/BranchDashboard';
import CustomerDetails from './pages/CustomerDetails';
import DayBook from './pages/DayBook';
import TeamManagement from './pages/TeamManagement';
import Accessories from './pages/Accessories';
import ExpenseIncome from './pages/ExpenseIncome';
import PurchaseOrder from './pages/PurchaseOrder';
import PhonePurchaseSale from './pages/PhonePurchaseSale';
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem('inex_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('inex_sidebar_collapsed', String(next));
      return next;
    });
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';
  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <nav className={`navbar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Toggle Arrow Button on sidebar border */}
        <button 
          className="sidebar-toggle-btn" 
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="nav-brand">
          <div className="nav-brand-container">
            <img 
              src={isSidebarCollapsed ? "/hna icon.png" : "/INEX final logo-04.png"} 
              alt="I-NEX Logo" 
              style={{ height: '28px', objectFit: 'contain' }} 
            />
            {!isSidebarCollapsed && (
              <span className="portal-badge">
                {user?.role === 'admin' ? 'Admin Portal' : 'Branch Portal'}
              </span>
            )}
          </div>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <Link to="/" onClick={closeMenu} className={`nav-link ${isActive('/')}`} title="Dashboard">
            <LayoutDashboard size={18} /> 
            <span className="nav-link-text">Dashboard</span>
          </Link>
          <Link to="/customers" onClick={closeMenu} className={`nav-link ${isActive('/customers')}`} title="Customers">
            <Users size={18} /> 
            <span className="nav-link-text">Customers</span>
          </Link>
          <Link to="/daybook" onClick={closeMenu} className={`nav-link ${isActive('/daybook')}`} title="Day Book">
            <BookOpen size={18} /> 
            <span className="nav-link-text">Day Book</span>
          </Link>
          <Link to="/accessories" onClick={closeMenu} className={`nav-link ${isActive('/accessories')}`} title="Accessories">
            <Package size={18} /> 
            <span className="nav-link-text">Accessories</span>
          </Link>
          <Link to="/expenses" onClick={closeMenu} className={`nav-link ${isActive('/expenses')}`} title="Expenses">
            <DollarSign size={18} /> 
            <span className="nav-link-text">Expenses</span>
          </Link>
          <Link to="/purchase" onClick={closeMenu} className={`nav-link ${isActive('/purchase')}`} title="Purchase">
            <ShoppingCart size={18} /> 
            <span className="nav-link-text">Purchase</span>
          </Link>
          <Link to="/phone-purchase-sale" onClick={closeMenu} className={`nav-link ${isActive('/phone-purchase-sale')}`} title="Phone Purchase & Sale">
            <Smartphone size={18} /> 
            <span className="nav-link-text">Phone Purchase/Sale</span>
          </Link>
          {user?.role === 'admin' && (
            <Link to="/team" onClick={closeMenu} className={`nav-link ${isActive('/team')}`} title="Team">
              <Settings size={18} /> 
              <span className="nav-link-text">Team</span>
            </Link>
          )}
          <button onClick={() => { closeMenu(); logout(); }} className="nav-link logout-btn mobile-logout-btn" style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </nav>
      <div className="content-wrapper">
        <header className="desktop-top-header">
          <button onClick={logout} className="logout-btn" style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </header>
        <main className="main-content">
          {children}
        </main>
        <footer className="app-footer powered-by-label">
          <span>powered by</span>
          <img src="/stibe-logo.png" alt="STIBE" className="powered-by-logo" />
        </footer>
      </div>
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
          <Route path="/daybook" element={<ProtectedRoute><Layout><DayBook /></Layout></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute allowedRoles={['admin']}><Layout><TeamManagement /></Layout></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><Layout><CustomerDetails /></Layout></ProtectedRoute>} />
          <Route path="/accessories" element={<ProtectedRoute><Layout><Accessories /></Layout></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><Layout><ExpenseIncome /></Layout></ProtectedRoute>} />
          <Route path="/purchase" element={<ProtectedRoute><Layout><PurchaseOrder /></Layout></ProtectedRoute>} />
          <Route path="/phone-purchase-sale" element={<ProtectedRoute><Layout><PhonePurchaseSale /></Layout></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout><DashboardRouter /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

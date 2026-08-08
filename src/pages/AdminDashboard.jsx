import React, { useState, useEffect } from 'react';
import { Users, BookOpen, TrendingUp, AlertCircle, Package, DollarSign, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchProjects } from '../api/frappeClient';

const AdminDashboard = () => {
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [pendingRepairsList, setPendingRepairsList] = useState([]);
  const [branchRevenueList, setBranchRevenueList] = useState([]);

  // Stats State
  const [stats, setStats] = useState({
    totalProjects: 0,
    dayBookEntries: 0,
    monthlyRevenue: 0,
    pendingRepairs: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const projects = await fetchProjects();
        
        let totalProjects = projects.length;
        let dayBookEntries = 0; 
        let monthlyRevenue = 0;
        let pendingRepairs = 0;

        let pendingList = [];
        let branchRevenues = {};

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const extractNote = (notes, key) => {
          if(!notes) return '';
          const match = notes.match(new RegExp(`${key}:\\s*(.*)`));
          return match ? match[1] : '';
        };

        projects.forEach(p => {
          // Calculate Day Book Entries (only count if it has sale/payment data, not just an estimate amount)
          const hasDayBookData = extractNote(p.notes, 'Cash') !== '' || 
                                 extractNote(p.notes, 'Bank') !== '' || 
                                 extractNote(p.notes, 'Credit') !== '' || 
                                 extractNote(p.notes, 'Consumption') !== '';
          if (hasDayBookData) {
            dayBookEntries++;
          }

          // Calculate pending repairs (only count strictly 'Open' projects)
          if (p.status === 'Open') {
            pendingRepairs++;
            pendingList.push({
              code: (p.project_name || '').trim().split(/\s+/)[0] || '-',
              name: (p.project_name || '').trim().split(/\s+/).slice(1).join(' ') || '-',
              model: p.custom_model_name || '-',
              branch: p.company || 'INEX'
            });
          }
          
          // Calculate monthly revenue
          if (p.creation) {
            const pDate = new Date(p.creation);
            if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
              const amount = p.total_billed_amount || 0;
              monthlyRevenue += amount;
              
              const branchName = p.company || 'INEX';
              branchRevenues[branchName] = (branchRevenues[branchName] || 0) + amount;
            }
          }
        });

        const revenueList = Object.keys(branchRevenues).map(branch => ({
          branch,
          amount: branchRevenues[branch]
        }));
        setPendingRepairsList(pendingList);
        setBranchRevenueList(revenueList);

        setStats({
          totalProjects,
          dayBookEntries,
          monthlyRevenue,
          pendingRepairs
        });

      } catch (error) {
        console.error("Failed to fetch stats", error);
      }
    };
    
    loadStats();
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Admin Overview</h1>
      
      <div className="dashboard-grid">
        <Link to="/customers" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--primary-color)' }}>
            <Users size={32} />
          </div>
          <div>
            <p className="stat-card-label">Total Projects</p>
            <h2 className="stat-card-value">{stats.totalProjects}</h2>
          </div>
        </Link>
        
        <Link to="/daybook" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--primary-color)' }}>
            <BookOpen size={32} />
          </div>
          <div>
            <p className="stat-card-label">Day Book Entries</p>
            <h2 className="stat-card-value">{stats.dayBookEntries}</h2>
          </div>
        </Link>
        
        <div onClick={() => setShowRevenueModal(true)} className="glass-card stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)' }}>
            <TrendingUp size={32} />
          </div>
          <div>
            <p className="stat-card-label">Monthly Revenue</p>
            <h2 className="stat-card-value">₹{stats.monthlyRevenue.toLocaleString('en-IN')}</h2>
          </div>
        </div>
        
        <div onClick={() => setShowPendingModal(true)} className="glass-card stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="stat-card-label">Pending Repairs</p>
            <h2 className="stat-card-value">{stats.pendingRepairs}</h2>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Data Management</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <Link to="/customers" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <Users size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Customer Details</h4>
                <p>View and manage all customer job cards</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>
            
            <Link to="/daybook" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <BookOpen size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Day Book Entries</h4>
                <p>View all daily entries across branches</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>
            
            <Link to="/accessories" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
                <Package size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Accessories (PG)</h4>
                <p>Manage accessory inventory and sales</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>
            
            <Link to="/expenses" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
                <DollarSign size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Expenses & Income (PG)</h4>
                <p>Track payments and expenditures</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>
          </div>
        </div>
      </div>

      {showRevenueModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Branch-wise Monthly Revenue</h3>
              <button onClick={() => setShowRevenueModal(false)} className="btn-icon" style={{ background: 'transparent', padding: '0.5rem', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>BRANCH</th>
                  <th style={{ textAlign: 'right' }}>REVENUE</th>
                </tr>
              </thead>
              <tbody>
                {branchRevenueList.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.branch}</td>
                    <td style={{ color: 'var(--primary-color)', fontWeight: 600, textAlign: 'right' }}>₹{item.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {branchRevenueList.length === 0 && (
                  <tr><td colSpan="2" style={{ textAlign: 'center' }}>No revenue data for this month.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPendingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Pending Repairs</h3>
              <button onClick={() => setShowPendingModal(false)} className="btn-icon" style={{ background: 'transparent', padding: '0.5rem', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>CODE</th>
                  <th style={{ textAlign: 'left' }}>CUSTOMER</th>
                  <th style={{ textAlign: 'left' }}>MODEL</th>
                  <th style={{ textAlign: 'left' }}>BRANCH</th>
                </tr>
              </thead>
              <tbody>
                {pendingRepairsList.map((item, i) => (
                  <tr key={i}>
                    <td>{item.code}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.model}</td>
                    <td>{item.branch}</td>
                  </tr>
                ))}
                {pendingRepairsList.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center' }}>No pending repairs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

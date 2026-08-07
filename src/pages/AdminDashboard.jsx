import React, { useState, useEffect } from 'react';
import { Users, BookOpen, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchProjects } from '../api/frappeClient';

const AdminDashboard = () => {
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
        let dayBookEntries = projects.length; // Same dataset currently
        let monthlyRevenue = 0;
        let pendingRepairs = 0;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        projects.forEach(p => {
          // Calculate pending repairs
          if (p.status !== 'Completed') {
            pendingRepairs++;
          }
          
          // Calculate monthly revenue
          if (p.creation) {
            const pDate = new Date(p.creation);
            if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
              monthlyRevenue += (p.total_billed_amount || 0);
            }
          }
        });

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
        <div className="glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--primary-color)' }}>
            <Users size={32} />
          </div>
          <div>
            <p className="stat-card-label">Total Projects</p>
            <h2 className="stat-card-value">{stats.totalProjects}</h2>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--primary-color)' }}>
            <BookOpen size={32} />
          </div>
          <div>
            <p className="stat-card-label">Day Book Entries</p>
            <h2 className="stat-card-value">{stats.dayBookEntries}</h2>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)' }}>
            <TrendingUp size={32} />
          </div>
          <div>
            <p className="stat-card-label">Monthly Revenue</p>
            <h2 className="stat-card-value">₹{stats.monthlyRevenue.toLocaleString('en-IN')}</h2>
          </div>
        </div>
        
        <div className="glass-card stat-card">
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Link to="/customers" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Users size={18} /> View Customer Details (Live)
            </Link>
            <Link to="/daybook" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <BookOpen size={18} /> View Day Book (Live)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

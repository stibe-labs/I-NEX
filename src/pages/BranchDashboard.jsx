import React, { useState, useEffect } from 'react';
import { Search, PlusCircle, Clock, Users, BookOpen, ChevronRight, Package, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { fetchProjects } from '../api/frappeClient';

const BranchDashboard = () => {
  const { user } = useAuth();
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchProjects();
        // Filter strictly for this branch
        const branchData = data.filter(p => p.company === user?.name);
        // Sort by creation date descending and take top 5
        const sortedData = branchData.sort((a, b) => new Date(b.creation) - new Date(a.creation)).slice(0, 5);
        setPendingEntries(sortedData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Helper to extract Complaint from notes
  const extractComplaint = (notes) => {
    if(!notes) return 'No complaint specified';
    const match = notes.match(/Complaint:\s*(.*)/);
    return match ? match[1] : 'No complaint specified';
  };
  
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: 0 }}>
          Branch Dashboard {user?.name ? `- ${user.name}` : ''}
        </h1>
        <Link to="/customers" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={18} /> New Entry
        </Link>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="text" className="input-field" placeholder="Search by Job Card, Customer Name, or Phone..." style={{ paddingLeft: '2.5rem' }} />
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="var(--warning-color)" /> Pending Today
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading pending entries...</p>
            ) : pendingEntries.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No entries yet. Click "New Entry" to add one!</p>
            ) : (
              pendingEntries.map((p, i) => {
                const nameParts = (p.project_name || '').trim().split(/\s+/);
                const code = nameParts[0] || `#${i+1}`;
                const name = nameParts.slice(1).join(' ') || 'Unknown';
                return (
                  <div key={p.name || i} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--warning-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>{code} - {name}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{p.custom_model_name || '-'}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Complaint: {extractComplaint(p.notes)}</p>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} color="var(--primary-color)" /> Quick Links
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <Link to="/customers" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <Users size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Add Customer Details</h4>
                <p>Create new job cards and customer records</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>

            <Link to="/daybook" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <BookOpen size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Update Day Book</h4>
                <p>Manage daily income and expenses</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>

            <Link to="/accessories" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <Package size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Accessories</h4>
                <p>Track accessory stock and sales</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>

            <Link to="/expenses" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <DollarSign size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Expense & Income</h4>
                <p>Manage payments in and out</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;

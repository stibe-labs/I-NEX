import React from 'react';
import { Search, PlusCircle, Users, BookOpen, ChevronRight, Package, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

const BranchDashboard = () => {
  const { user } = useAuth();
  
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

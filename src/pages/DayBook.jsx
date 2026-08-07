import React, { useState, useEffect } from 'react';
import { fetchProjects, createProject } from '../api/frappeClient';
import { Plus, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const DayBook = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local form state
  const [formData, setFormData] = useState({
    sl_no: '', customer_name: '', job_card: '', model_name: '',
    consumption: '', warranty: '', cash: '', bank: '', credit: '',
    cost: '', profit: ''
  });

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if(!formData.job_card || !formData.customer_name) {
      toast.error("Job Card Code and Customer Name are required");
      return;
    }
    
    setIsSaving(true);
    try {
      const projectData = {
        project_name: `${formData.job_card} ${formData.customer_name}`,
        company: user?.role === 'admin' ? 'Admin' : (user?.name || 'Unknown Branch'),
        status: 'Open',
        custom_model_name: formData.model_name,
        total_billed_amount: parseFloat(formData.profit) || 0,
        total_costing_amount: parseFloat(formData.cost) || 0,
        notes: `Consumption: ${formData.consumption}\nWarranty: ${formData.warranty}\nCash: ${formData.cash}\nBank: ${formData.bank}\nCredit: ${formData.credit}`
      };
      
      await createProject(projectData);
      toast.success("DayBook Entry Created!");
      
      await loadData();
      setIsAdding(false);
      setFormData({
        sl_no: '', customer_name: '', job_card: '', model_name: '',
        consumption: '', warranty: '', cash: '', bank: '', credit: '',
        cost: '', profit: ''
      });
    } catch (e) {
      toast.error("Failed to save to Frappe.");
    } finally {
      setIsSaving(false);
    }
  };

  const extractNote = (notes, key) => {
    if(!notes) return '';
    const match = notes.match(new RegExp(`${key}:\\s*(.*)`));
    return match ? match[1] : '';
  };

  // Filter projects based on search term and user role
  const filteredProjects = projects.filter(p => {
    // Branch Filter: Branches only see their own records. Admins see all.
    if (user?.role === 'branch' && p.company !== user?.name) return false;

    const term = searchTerm.toLowerCase();
    const nameStr = (p.project_name || '').toLowerCase();
    const modelStr = (p.custom_model_name || '').toLowerCase();
    return nameStr.includes(term) || modelStr.includes(term);
  });

  const handleClear = () => {
    setFormData({
      customer_name: '', job_card: '', model_name: '',
      consumption: '', warranty: '', cash: '', bank: '', credit: '',
      cost: '', profit: ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-fill logic when typing Code
      if (field === 'job_card' && value.trim().length >= 4) {
        const match = projects.find(p => {
          const code = (p.project_name || '').trim().split(/\s+/)[0];
          return code.toLowerCase() === value.trim().toLowerCase();
        });

        if (match) {
          const nameParts = (match.project_name || '').trim().split(/\s+/);
          const name = nameParts.slice(1).join(' ') || '';
          
          if (!prev.customer_name && name) next.customer_name = name;
          if (!prev.model_name && match.custom_model_name) next.model_name = match.custom_model_name;
        }
      }
      return next;
    });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Day Book</h1>
        {!isAdding && (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={18} /> New Entry
          </button>
        )}
      </div>

      {isAdding && (
        <div className="glass-card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>New Day Book Entry</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Job Card</label>
              <input type="text" className="input-field" value={formData.job_card} onChange={e => handleInputChange('job_card', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Customer Name</label>
              <input type="text" className="input-field" value={formData.customer_name} onChange={e => handleInputChange('customer_name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Model Name</label>
              <input type="text" className="input-field" value={formData.model_name} onChange={e => handleInputChange('model_name', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Consumption</label>
              <input type="text" className="input-field" value={formData.consumption} onChange={e => handleInputChange('consumption', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Warranty</label>
              <input type="text" className="input-field" value={formData.warranty} onChange={e => handleInputChange('warranty', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Cash</label>
              <input type="text" className="input-field" value={formData.cash} onChange={e => handleInputChange('cash', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Bank</label>
              <input type="text" className="input-field" value={formData.bank} onChange={e => handleInputChange('bank', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Cost</label>
              <input type="text" className="input-field" value={formData.cost} onChange={e => handleInputChange('cost', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Profit</label>
              <input type="text" className="input-field" value={formData.profit} onChange={e => handleInputChange('profit', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save to Frappe'}
            </button>
            <button className="btn" style={{ background: 'rgba(0,0,0,0.05)' }} onClick={() => { setIsAdding(false); handleClear(); }}>
              <X size={18} /> Cancel
            </button>
            <button className="btn" style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b' }} onClick={handleClear}>
              Clear All
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by Code, Name, or Model..." 
            style={{ width: '100%', maxWidth: '350px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading live data from Frappe...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>SL. NO</th>
                <th>CUSTOMER NAME</th>
                <th>JOB CARD</th>
                <th>MODEL.NAME</th>
                <th>CONSUMPTION</th>
                <th>WARRANTY</th>
                <th>CASH</th>
                <th>BANK</th>
                <th>CREDIT</th>
                <th>COST</th>
                <th>PROFIT</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p, i) => {
                // Parse project_name (e.g. "104691 Shamzad") into Code and Name
                // using trim and regex to handle accidental double spaces or leading spaces from Frappe
                const nameParts = (p.project_name || '').trim().split(/\s+/);
                const code = nameParts[0] || '';
                const name = nameParts.slice(1).join(' ') || '';

                return (
                  <tr key={p.name || i}>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{p.name || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{name}</td>
                    <td>{code}</td>
                    <td>{p.custom_model_name || '-'}</td>
                    <td>{extractNote(p.notes, 'Consumption') || '-'}</td>
                    <td>{extractNote(p.notes, 'Warranty') || '-'}</td>
                    <td>{extractNote(p.notes, 'Cash') || '-'}</td>
                    <td>{extractNote(p.notes, 'Bank') || '-'}</td>
                    <td>{extractNote(p.notes, 'Credit') || '-'}</td>
                    <td>{p.total_costing_amount || '-'}</td>
                    <td style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{p.total_billed_amount || '-'}</td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>No records found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DayBook;

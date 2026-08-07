import React, { useState, useEffect } from 'react';
import { fetchProjects, createProject } from '../api/frappeClient';
import { Plus, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const CustomerDetails = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Local form state
  const [formData, setFormData] = useState({
    code: '', name: '', phone_no: '', model: '', imei_no: '',
    complaint: '', passcode: '', amount: '', receiver: '', technician: '',
    update: '', delivery: ''
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if(!formData.code || !formData.name) {
      toast.error("Job Card Code and Customer Name are required");
      return;
    }
    
    setIsSaving(true);
    try {
      // Map frontend form to Project DocType
      const projectData = {
        project_name: `${formData.code} ${formData.name}`,
        company: user?.role === 'admin' ? 'Admin' : (user?.name || 'Unknown Branch'),
        status: 'Open', // default status
        custom_phone: formData.phone_no,
        custom_model_name: formData.model,
        custom_imei_number: formData.imei_no,
        total_billed_amount: parseFloat(formData.amount) || 0,
        // Pack the rest into notes
        notes: `Complaint: ${formData.complaint}\nPasscode: ${formData.passcode}\nReceiver: ${formData.receiver}\nTechnician: ${formData.technician}\nUpdate: ${formData.update}\nDelivery: ${formData.delivery}`
      };
      
      await createProject(projectData);
      toast.success('Customer Details Saved!');
      
      // Reload and reset
      await loadData();
      setIsAdding(false);
      setFormData({
        code: '', name: '', phone_no: '', model: '', imei_no: '',
        complaint: '', passcode: '', amount: '', receiver: '', technician: '',
        update: '', delivery: ''
      });
    } catch (e) {
      toast.error("Failed to save to Frappe. See console.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to parse notes for UI display if needed (simplified for now)
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
    const phoneStr = (p.custom_phone || '').toLowerCase();
    const modelStr = (p.custom_model_name || '').toLowerCase();
    const imeiStr = (p.custom_imei_number || '').toLowerCase();
    return nameStr.includes(term) || phoneStr.includes(term) || modelStr.includes(term) || imeiStr.includes(term);
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-fill logic when typing Code or Phone No (searches full list)
      if ((field === 'code' || field === 'phone_no') && value.trim().length >= 4) {
        const match = projects.find(p => {
          if (field === 'code') {
            const code = (p.project_name || '').trim().split(/\s+/)[0];
            return code.toLowerCase() === value.trim().toLowerCase();
          }
          if (field === 'phone_no') {
            return p.custom_phone === value.trim();
          }
          return false;
        });

        if (match) {
          const nameParts = (match.project_name || '').trim().split(/\s+/);
          const name = nameParts.slice(1).join(' ') || '';
          
          if (!prev.name && name) next.name = name;
          if (!prev.phone_no && match.custom_phone) next.phone_no = match.custom_phone;
          if (!prev.model && match.custom_model_name) next.model = match.custom_model_name;
          if (!prev.imei_no && match.custom_imei_number) next.imei_no = match.custom_imei_number;
        }
      }
      return next;
    });
  };

  const handleClear = () => {
    setFormData({
      code: '', name: '', phone_no: '', model: '', imei_no: '',
      complaint: '', passcode: '', amount: '', technician: ''
    });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Customer Details</h1>
        {!isAdding && (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={18} /> Add Entry
          </button>
        )}
      </div>

      {isAdding && (
        <div className="glass-card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>New Customer Detail</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Job Card Code</label>
              <input type="text" className="input-field" value={formData.code} onChange={e => handleInputChange('code', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Phone No</label>
              <input type="text" className="input-field" value={formData.phone_no} onChange={e => handleInputChange('phone_no', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Customer Name</label>
              <input type="text" className="input-field" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Model</label>
              <input type="text" className="input-field" value={formData.model} onChange={e => handleInputChange('model', e.target.value)} />
            </div>
            <div className="input-group">
              <label>IMEI No</label>
              <input type="text" className="input-field" value={formData.imei_no} onChange={e => handleInputChange('imei_no', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Complaint</label>
              <input type="text" className="input-field" value={formData.complaint} onChange={e => handleInputChange('complaint', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Passcode</label>
              <input type="text" className="input-field" value={formData.passcode} onChange={e => handleInputChange('passcode', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Amount</label>
              <input type="text" className="input-field" value={formData.amount} onChange={e => handleInputChange('amount', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Technician</label>
              <input type="text" className="input-field" value={formData.technician} onChange={e => handleInputChange('technician', e.target.value)} />
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
            placeholder="Search by Code, Name, Phone, or Model..." 
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
                <th>DATE</th>
                <th>CODE</th>
                <th>NAME</th>
                <th>PHONE NO</th>
                <th>MODEL</th>
                <th>IMEI NO</th>
                <th>COMPLAINT</th>
                <th>PASSCODE</th>
                <th>AMOUNT</th>
                <th>RECEIVER</th>
                <th>TECHNICIAN</th>
                <th>UPDATE</th>
                <th>DELIVERY</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p, i) => {
                // Parse project_name (e.g. "104691 Shamzad") into Code and Name
                // using trim and regex to handle accidental double spaces or leading spaces from Frappe
                const nameParts = (p.project_name || '').trim().split(/\s+/);
                const code = nameParts[0] || '';
                const name = nameParts.slice(1).join(' ') || '';
                
                // Format Date from Frappe creation field
                const dateObj = new Date(p.creation);
                const dateString = isNaN(dateObj) ? '' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

                return (
                  <tr key={p.name || i}>
                    <td>{dateString}</td>
                    <td>{code}</td>
                    <td style={{ fontWeight: 600 }}>{name}</td>
                    <td>{p.custom_phone || '-'}</td>
                    <td>{p.custom_model_name || '-'}</td>
                    <td>{p.custom_imei_number || '-'}</td>
                    <td>{extractNote(p.notes, 'Complaint') || '-'}</td>
                    <td>{extractNote(p.notes, 'Passcode') || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{p.total_billed_amount || '-'}</td>
                    <td>{extractNote(p.notes, 'Receiver') || '-'}</td>
                    <td>{extractNote(p.notes, 'Technician') || '-'}</td>
                    <td>{extractNote(p.notes, 'Update') || '-'}</td>
                    <td>{extractNote(p.notes, 'Delivery') || '-'}</td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: '2rem' }}>No records found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CustomerDetails;

import React, { useState, useEffect } from 'react';
import { fetchProjects, createProject, deleteProject, updateProject } from '../api/frappeClient';
import { Plus, Save, X, MoreVertical, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const CustomerDetails = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  // Local form state
  const [formData, setFormData] = useState({
    code: '', name: '', phone_no: '+91-', model: '', imei_no: '',
    complaint: '', passcode: '', amount: '', receiver: '', technician: '',
    update: '', delivery: '', branch: ''
  });

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');

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
      let isValidPhone = false;
      if (formData.phone_no && formData.phone_no.trim() !== '+91-') {
        const phoneDigits = formData.phone_no.replace('+91-', '').replace(/\D/g, '');
        // Check if it is exactly 10 digits and starts with 6,7,8, or 9
        if (phoneDigits.length === 10 && /^[6-9]/.test(phoneDigits)) {
          isValidPhone = true;
        }
      }

      const phoneToSave = isValidPhone ? formData.phone_no : '';
      const notesPhoneStr = (!isValidPhone && formData.phone_no && formData.phone_no.trim() !== '+91-') 
                             ? `\nPhone: ${formData.phone_no}` : '';

      const projectName = `${formData.code} ${formData.name}`;
      const projectData = {
        project_name: projectName,
        company: user?.role === 'admin' ? (formData.branch || 'INEX') : (user?.name || 'INEX'),
        // We omit status here and add it only for new projects below
        // status: 'Open',
        custom_phone: phoneToSave,
        custom_model_name: formData.model,
        custom_imei_number: formData.imei_no,
        // Pack the rest into notes
        notes: `Complaint: ${formData.complaint}\nPasscode: ${formData.passcode}\nReceiver: ${formData.receiver}\nTechnician: ${formData.technician}\nUpdate: ${formData.update}\nDelivery: ${formData.delivery}\nAmount: ${formData.amount}${notesPhoneStr}`
      };
      
      const existingProject = projects.find(p => {
        const normalize = (str) => (str || '').trim().replace(/\s+/g, ' ').toLowerCase();
        return normalize(p.project_name) === normalize(projectName);
      });
      
      if (existingProject) {
        // Fallback: update if it already exists to prevent "must be unique" errors
        await updateProject(existingProject.name, projectData);
        toast.success('Customer Details Updated!');
      } else {
        projectData.status = 'Open';
        await createProject(projectData);
        toast.success('Customer Details Saved!');
      }
      
      // Reload and reset
      await loadData();
      setIsAdding(false);
      setFormData({
        code: '', name: '', phone_no: '+91-', model: '', imei_no: '',
        complaint: '', passcode: '', amount: '', receiver: '', technician: '',
        update: '', delivery: '', branch: ''
      });
    } catch (e) {
      toast.error(e.message || "Failed to save to Frappe. See console.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (window.confirm("Are you sure you want to delete this customer detail entry?")) {
      try {
        await deleteProject(projectId);
        toast.success("Entry deleted successfully!");
        setOpenMenuId(null);
        await loadData();
      } catch (error) {
        toast.error(error.message || "Failed to delete entry from Frappe.");
      }
    }
  };

  // Helper to parse notes for UI display if needed (simplified for now)
  const extractNote = (notes, key) => {
    if (!notes) return '';
    const plainText = notes.replace(/<[^>]*>?/gm, '\n');
    const match = plainText.match(new RegExp(`${key}:[ \\t]*(.*)`));
    return match ? match[1].trim() : '';
  };

  // Filter projects based on search term and user role
  const filteredProjects = projects.filter(p => {
    // Branch Filter: Branches only see their own records. Admins see all.
    if (user?.role === 'branch' && p.company !== user?.name) return false;
    
    // Admin branch filter dropdown
    if (user?.role === 'admin' && filterBranch !== 'All' && p.company !== filterBranch) return false;

    const term = searchTerm.toLowerCase();
    const nameStr = (p.project_name || '').toLowerCase();
    const phoneStr = (p.custom_phone || extractNote(p.notes, 'Phone') || '').toLowerCase();
    const modelStr = (p.custom_model_name || '').toLowerCase();
    const imeiStr = (p.custom_imei_number || '').toLowerCase();
    return nameStr.includes(term) || phoneStr.includes(term) || modelStr.includes(term) || imeiStr.includes(term);
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-fill logic when typing Code or Phone No (searches full list)
      if ((field === 'code' || field === 'phone_no') && value.trim().length > 0) {
        const match = projects.find(p => {
          if (field === 'code') {
            const code = (p.project_name || '').trim().split(/\s+/)[0];
            return code.toLowerCase() === value.trim().toLowerCase();
          }
          if (field === 'phone_no') {
            const pPhone = p.custom_phone || extractNote(p.notes, 'Phone');
            return pPhone === value.trim();
          }
          return false;
        });

        if (match) {
          const nameParts = (match.project_name || '').trim().split(/\s+/);
          const name = nameParts.slice(1).join(' ') || '';
          const mPhone = match.custom_phone || extractNote(match.notes, 'Phone');
          
          if (!prev.name && name) next.name = name;
          if (!prev.phone_no && mPhone) next.phone_no = mPhone;
          if (!prev.model && match.custom_model_name) next.model = match.custom_model_name;
          if (!prev.imei_no && match.custom_imei_number) next.imei_no = match.custom_imei_number;
        }
      }
      return next;
    });
  };

  const handleClear = () => {
    setFormData({
      code: '', name: '', phone_no: '+91-', model: '', imei_no: '',
      complaint: '', passcode: '', amount: '', receiver: '', technician: '', branch: ''
    });
  };

  const uniqueTechnicians = Array.from(new Set(projects.map(p => extractNote(p.notes, 'Technician')).filter(Boolean)));
  const uniqueReceivers = Array.from(new Set(projects.map(p => extractNote(p.notes, 'Receiver')).filter(Boolean)));

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
            {user?.role === 'admin' && (
              <div className="input-group">
                <label>Branch</label>
                <select 
                  className="input-field" 
                  value={formData.branch} 
                  onChange={e => handleInputChange('branch', e.target.value)}
                  required
                >
                  <option value="">Select Branch</option>
                  {Array.from(new Set(projects.map(p => p.company))).filter(Boolean).map((branch, i) => (
                    <option key={i} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
            )}
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
              <input type="text" className="input-field" list="technician-list" value={formData.technician} onChange={e => handleInputChange('technician', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Receiver</label>
              <input type="text" className="input-field" list="receiver-list" value={formData.receiver} onChange={e => handleInputChange('receiver', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Update</label>
              <input type="text" className="input-field" value={formData.update} onChange={e => handleInputChange('update', e.target.value)} />
            </div>
          </div>

          <datalist id="technician-list">
            {uniqueTechnicians.map((tech, i) => (
              <option key={i} value={tech} />
            ))}
          </datalist>
          <datalist id="receiver-list">
            {uniqueReceivers.map((rec, i) => (
              <option key={i} value={rec} />
            ))}
          </datalist>

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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          {user?.role === 'admin' && (
            <select 
              className="input-field" 
              style={{ width: 'auto', minWidth: '150px' }}
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
            >
              <option value="All">All Branches</option>
              {Array.from(new Set(projects.map(p => p.company))).filter(Boolean).map((branch, i) => (
                <option key={i} value={branch}>{branch}</option>
              ))}
            </select>
          )}
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
                <th style={{ width: '50px', textAlign: 'center' }}>ACT.</th>
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
                    <td>{p.custom_phone || extractNote(p.notes, 'Phone') || '-'}</td>
                    <td>{p.custom_model_name || '-'}</td>
                    <td>{p.custom_imei_number || '-'}</td>
                    <td>{extractNote(p.notes, 'Complaint') || '-'}</td>
                    <td>{extractNote(p.notes, 'Passcode') || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{extractNote(p.notes, 'Amount') || p.total_billed_amount || '-'}</td>
                    <td>{extractNote(p.notes, 'Receiver') || '-'}</td>
                    <td>{extractNote(p.notes, 'Technician') || '-'}</td>
                    <td>{extractNote(p.notes, 'Update') || '-'}</td>
                    <td>{extractNote(p.notes, 'Delivery') || '-'}</td>
                    <td style={{ position: 'relative' }}>
                      <button 
                        className="btn-icon" 
                        onClick={() => setOpenMenuId(openMenuId === p.name ? null : p.name)}
                        style={{ padding: '0.25rem', background: 'transparent' }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === p.name && (
                        <div 
                          ref={menuRef}
                          className="dropdown-menu" 
                          style={{
                            position: 'absolute',
                            right: '30px',
                            top: '10px',
                            background: 'white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            borderRadius: '8px',
                            zIndex: 100,
                            minWidth: '120px',
                            overflow: 'hidden'
                          }}
                        >
                          <button 
                            onClick={() => handleDelete(p.name)}
                            style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#ff6b6b' }}
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan="14" style={{ textAlign: 'center', padding: '2rem' }}>No records found matching your search.</td>
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

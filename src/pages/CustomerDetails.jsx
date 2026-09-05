import React, { useState, useEffect } from 'react';
import { fetchProjects, createProject, deleteProject, updateProject } from '../api/frappeClient';
import { Plus, Save, X, MoreVertical, Trash2, Edit, RefreshCw } from 'lucide-react';
import { useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

export const STATUS_OPTIONS = [
  '🟡 Pending',
  '🔵 In Progress',
  '🟣 Waiting for Parts',
  '🟠 Follow-up',
  '🔴 On Hold',
  '🟢 Ready for Pickup',
  '📦 Returned',
  '✅ Finished'
];

export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case '🟡 Pending':
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
    case '🔵 In Progress':
      return { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' };
    case '🟣 Waiting for Parts':
      return { background: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' };
    case '🟠 Follow-up':
      return { background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' };
    case '🔴 On Hold':
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    case '🟢 Ready for Pickup':
      return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
    case '📦 Returned':
      return { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' };
    case '✅ Finished':
      return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
    default:
      return { background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' };
  }
};

const CustomerDetails = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editProjectId, setEditProjectId] = useState(null);
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
    source: '', delivery: '', branch: '', status: '🟡 Pending'
  });

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTechnician, setFilterTechnician] = useState('All');
  const [filterReceiver, setFilterReceiver] = useState('All');

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

  const getNextJobCardCode = (branchName, allProjects) => {
    if (!branchName) return '';
    
    const normalizedBranch = branchName.toLowerCase().replace(/\s+/g, '');
    const baseCodes = {
      'inexthodupuzha': 1304,
      'inexkaloor': 105917,
      'inexperumbavoor': 104979
    };
    
    const branchProjects = allProjects.filter(p => p.company === branchName);
    
    let maxCode = baseCodes[normalizedBranch] || 0; 
    
    branchProjects.forEach(p => {
      const codeStr = (p.project_name || '').trim().split(/\s+/)[0];
      const codeNum = parseInt(codeStr, 10);
      if (!isNaN(codeNum) && codeNum > maxCode) {
        maxCode = codeNum;
      }
    });

    return maxCode > 0 ? (maxCode + 1).toString() : '';
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
        notes: `Complaint: ${formData.complaint}\nPasscode: ${formData.passcode}\nReceiver: ${formData.receiver}\nTechnician: ${formData.technician}\nSource: ${formData.source}\nDelivery: ${formData.delivery}\nAmount: ${formData.amount}\nStatus: ${formData.status || '🟡 Pending'}${notesPhoneStr}`
      };
      
      let actualEditProjectId = editProjectId;
      
      if (!actualEditProjectId) {
        // Fallback: update if it already exists to prevent "must be unique" errors
        const existingProject = projects.find(p => {
          const normalize = (str) => (str || '').trim().replace(/\s+/g, ' ').toLowerCase();
          return normalize(p.project_name) === normalize(projectName);
        });
        if (existingProject) {
          actualEditProjectId = existingProject.name;
        }
      }
      
      if (actualEditProjectId) {
        await updateProject(actualEditProjectId, projectData);
        toast.success('Customer Details Updated!');
      } else {
        // NEW PROJECT: Fetch fresh data to prevent race conditions (duplicate Job Card Codes)
        const latestProjects = await fetchProjects();
        const currentNextCode = getNextJobCardCode(projectData.company, latestProjects);
        
        // Check if the chosen code is already taken in this branch
        const codeIsTaken = latestProjects.some(p => {
          if (p.company !== projectData.company) return false;
          const pCode = (p.project_name || '').trim().split(/\s+/)[0];
          return pCode === formData.code;
        });
        
        // If the code they are trying to save is already taken, bump it
        if (codeIsTaken) {
          projectData.project_name = `${currentNextCode} ${formData.name}`;
          toast.success(`Job Card Code ${formData.code} is already taken. Auto-updated to ${currentNextCode} to prevent duplicates.`);
        }
        
        projectData.status = 'Open';
        await createProject(projectData);
        toast.success('Customer Details Saved!');
      }
      
      // Reload and reset
      await loadData();
      setIsAdding(false);
      setEditProjectId(null);
      setFormData({
        code: '', name: '', phone_no: '+91-', model: '', imei_no: '',
        complaint: '', passcode: '', amount: '', receiver: '', technician: '',
        source: '', delivery: '', branch: '', status: '🟡 Pending'
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

  const handleEdit = (p) => {
    const nameParts = (p.project_name || '').trim().split(/\s+/);
    const code = nameParts[0] || '';
    const name = nameParts.slice(1).join(' ') || '';
    
    setFormData({
      code: code,
      name: name,
      phone_no: p.custom_phone || extractNote(p.notes, 'Phone') || '+91-',
      model: p.custom_model_name || '',
      imei_no: p.custom_imei_number || '',
      complaint: extractNote(p.notes, 'Complaint') || '',
      passcode: extractNote(p.notes, 'Passcode') || '',
      amount: extractNote(p.notes, 'Amount') || p.total_billed_amount || '',
      receiver: extractNote(p.notes, 'Receiver') || '',
      technician: extractNote(p.notes, 'Technician') || '',
      source: extractNote(p.notes, 'Source') || extractNote(p.notes, 'Update') || '',
      delivery: extractNote(p.notes, 'Delivery') || '',
      branch: p.company || '',
      status: extractNote(p.notes, 'Status') || '🟡 Pending'
    });
    setEditProjectId(p.name);
    setIsAdding(true);
    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickStatusChange = async (project, newStatus) => {
    const currentNotes = project.notes || '';
    let updatedNotes = '';
    const plainText = currentNotes.replace(/<[^>]*>?/gm, '\n');
    if (/Status:[ \t]*(.*)/i.test(plainText)) {
      updatedNotes = plainText.replace(/Status:[ \t]*(.*)/i, `Status: ${newStatus}`);
    } else {
      updatedNotes = plainText ? `${plainText.trim()}\nStatus: ${newStatus}` : `Status: ${newStatus}`;
    }

    // Optimistically update UI
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.name === project.name ? { ...p, notes: updatedNotes } : p
      )
    );

    try {
      await updateProject(project.name, { notes: updatedNotes });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update status');
      // Rollback on error
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.name === project.name ? { ...p, notes: currentNotes } : p
        )
      );
    }
  };

  // Helper to parse notes for UI display if needed (simplified for now)
  const extractNote = (notes, key) => {
    if (!notes) return '';
    const plainText = notes.replace(/<[^>]*>?/gm, '\n');
    const match = plainText.match(new RegExp(`${key}:[ \\t]*(.*)`));
    return match ? match[1].trim() : '';
  };

  // Filter projects based on search term, branch, status, receiver, and technician
  const filteredProjects = projects.filter(p => {
    // Branch Filter: Branches only see their own records. Admins see all.
    if (user?.role === 'branch' && p.company !== user?.name) return false;
    
    // Admin branch filter dropdown
    if (user?.role === 'admin' && filterBranch !== 'All' && p.company !== filterBranch) return false;

    // Status Filter
    const rowStatus = extractNote(p.notes, 'Status') || '🟡 Pending';
    if (filterStatus !== 'All' && rowStatus !== filterStatus) return false;

    // Receiver Filter
    const rowReceiver = p.custom_receiver || extractNote(p.notes, 'Receiver') || '';
    if (filterReceiver !== 'All' && rowReceiver !== filterReceiver) return false;

    // Technician Filter
    const rowTechnician = p.custom_technician || extractNote(p.notes, 'Technician') || '';
    if (filterTechnician !== 'All' && rowTechnician !== filterTechnician) return false;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const nameStr = (p.project_name || '').toLowerCase();
    const phoneStr = (p.custom_phone || extractNote(p.notes, 'Phone') || '').toLowerCase();
    const modelStr = (p.custom_model_name || '').toLowerCase();
    const imeiStr = (p.custom_imei_number || '').toLowerCase();
    const receiverStr = rowReceiver.toLowerCase();
    const technicianStr = rowTechnician.toLowerCase();
    const statusStr = rowStatus.toLowerCase();
    return nameStr.includes(term) || 
           phoneStr.includes(term) || 
           modelStr.includes(term) || 
           imeiStr.includes(term) || 
           receiverStr.includes(term) || 
           technicianStr.includes(term) || 
           statusStr.includes(term);
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
          
          next.name = name;
          next.phone_no = mPhone || '+91-';
          next.model = match.custom_model_name || '';
          next.imei_no = match.custom_imei_number || '';
          next.status = extractNote(match.notes, 'Status') || '🟡 Pending';
        } else {
          if (field === 'code') {
            next.name = '';
            next.phone_no = '+91-';
            next.model = '';
            next.imei_no = '';
            next.status = '🟡 Pending';
          }
        }
      }
      return next;
    });
  };

  const handleClear = () => {
    const initialBranch = user?.role === 'admin' ? '' : (user?.name || '');
    let nextCode = '';
    if (initialBranch) {
      nextCode = getNextJobCardCode(initialBranch, projects);
    }
    setFormData({
      code: nextCode, name: '', phone_no: '+91-', model: '', imei_no: '',
      complaint: '', passcode: '', amount: '', receiver: '', technician: '', source: '', delivery: '', branch: initialBranch,
      status: '🟡 Pending'
    });
    setEditProjectId(null);
  };

  const visibleProjectsForDropdowns = user?.role === 'branch' 
    ? projects.filter(p => p.company === user?.name)
    : (filterBranch !== 'All' ? projects.filter(p => p.company === filterBranch) : projects);

  const uniqueTechnicians = Array.from(new Set(visibleProjectsForDropdowns.map(p => p.custom_technician || extractNote(p.notes, 'Technician')).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const uniqueReceivers = Array.from(new Set(visibleProjectsForDropdowns.map(p => p.custom_receiver || extractNote(p.notes, 'Receiver')).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const uniqueModels = Array.from(new Set(projects.map(p => p.custom_model_name).filter(Boolean)));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Customer Details</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn" style={{ background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </button>
          {!isAdding && (
          <button className="btn btn-primary" onClick={() => {
            const initialBranch = user?.role === 'admin' ? '' : (user?.name || '');
            let nextCode = '';
            if (initialBranch) {
               nextCode = getNextJobCardCode(initialBranch, projects);
            }
            setFormData({
              code: nextCode, name: '', phone_no: '+91-', model: '', imei_no: '',
              complaint: '', passcode: '', amount: '', receiver: '', technician: '',
              source: '', delivery: '', branch: initialBranch,
              status: '🟡 Pending'
            });
            setEditProjectId(null);
            setIsAdding(true);
          }}>
            <Plus size={18} /> Add Entry
          </button>
        )}
        </div>
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
                  onChange={e => {
                    const selectedBranch = e.target.value;
                    const nextCode = getNextJobCardCode(selectedBranch, projects);
                    setFormData(prev => ({ ...prev, branch: selectedBranch, code: nextCode }));
                  }}
                  required
                >
                  <option value="">Select Branch</option>
                  {Array.from(new Set(['INEX Thodupuzha', 'INEX Kaloor', 'INEX Perumbavoor', ...projects.map(p => p.company)])).filter(Boolean).map((branch, i) => (
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
              <input type="text" className="input-field" list="model-list" value={formData.model} onChange={e => handleInputChange('model', e.target.value)} />
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
              <label>Source</label>
              <select className="input-field" value={formData.source} onChange={e => handleInputChange('source', e.target.value)}>
                <option value="">Select Source</option>
                <option value="Walking">Walking</option>
                <option value="Online">Online</option>
                <option value="Old">Old</option>
                <option value="Shop">Shop</option>
              </select>
            </div>
            <div className="input-group">
              <label>Status</label>
              <select className="input-field" value={formData.status} onChange={e => handleInputChange('status', e.target.value)}>
                {STATUS_OPTIONS.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
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
          <datalist id="model-list">
            {uniqueModels.map((model, i) => (
              <option key={i} value={model} />
            ))}
          </datalist>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : (editProjectId ? 'Update Entry' : 'Save to Frappe')}
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap', alignItems: 'center' }}>
          {user?.role === 'admin' && (
            <select 
              className="input-field" 
              style={{ width: 'auto', minWidth: '140px' }}
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
            >
              <option value="All">All Branches</option>
              {Array.from(new Set(['INEX Thodupuzha', 'INEX Kaloor', 'INEX Perumbavoor', ...projects.map(p => p.company)])).filter(Boolean).map((branch, i) => (
                <option key={i} value={branch}>{branch}</option>
              ))}
            </select>
          )}
          <select 
            className="input-field" 
            style={{ width: 'auto', minWidth: '140px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
          <select 
            className="input-field" 
            style={{ width: 'auto', minWidth: '140px' }}
            value={filterReceiver}
            onChange={e => setFilterReceiver(e.target.value)}
          >
            <option value="All">All Receivers</option>
            {uniqueReceivers.map((rec, i) => (
              <option key={i} value={rec}>{rec}</option>
            ))}
          </select>
          <select 
            className="input-field" 
            style={{ width: 'auto', minWidth: '140px' }}
            value={filterTechnician}
            onChange={e => setFilterTechnician(e.target.value)}
          >
            <option value="All">All Technicians</option>
            {uniqueTechnicians.map((tech, i) => (
              <option key={i} value={tech}>{tech}</option>
            ))}
          </select>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by Code, Name, Phone, Tech, Receiver, Status..." 
            style={{ width: '100%', maxWidth: '320px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {(filterStatus !== 'All' || filterReceiver !== 'All' || filterTechnician !== 'All' || (user?.role === 'admin' && filterBranch !== 'All') || searchTerm) && (
            <button
              className="btn"
              style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
              onClick={() => {
                setFilterStatus('All');
                setFilterReceiver('All');
                setFilterTechnician('All');
                if (user?.role === 'admin') setFilterBranch('All');
                setSearchTerm('');
              }}
              title="Reset all filters"
            >
              Reset Filters
            </button>
          )}
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
                <th>SOURCE</th>
                <th>DELIVERY</th>
                <th>STATUS</th>
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
                    <td style={{ maxWidth: '220px', minWidth: '140px', whiteSpace: 'normal', verticalAlign: 'middle' }}>
                      <div style={{
                        maxWidth: '220px',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: '1.35',
                        fontSize: '0.85rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} title={extractNote(p.notes, 'Complaint') || undefined}>
                        {extractNote(p.notes, 'Complaint') || '-'}
                      </div>
                    </td>
                    <td>{extractNote(p.notes, 'Passcode') || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{extractNote(p.notes, 'Amount') || p.total_billed_amount || '-'}</td>
                    <td>{extractNote(p.notes, 'Receiver') || '-'}</td>
                    <td>{extractNote(p.notes, 'Technician') || '-'}</td>
                    <td>{extractNote(p.notes, 'Source') || extractNote(p.notes, 'Update') || '-'}</td>
                    <td>{extractNote(p.notes, 'Delivery') || '-'}</td>
                    <td>
                      {(() => {
                        const currentStatus = extractNote(p.notes, 'Status') || '🟡 Pending';
                        const badgeStyle = getStatusBadgeStyle(currentStatus);
                        return (
                          <div style={{ display: 'inline-block', position: 'relative' }}>
                            <select
                              value={currentStatus}
                              onChange={(e) => handleQuickStatusChange(p, e.target.value)}
                              style={{
                                ...badgeStyle,
                                padding: '0.3rem 0.6rem',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                outline: 'none',
                                appearance: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                textAlign: 'center',
                                paddingRight: '1.2rem',
                                backgroundPosition: 'right 0.4rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%3E%3Cpath%20fill%3D%22%234b5563%22%20d%3D%22M0%200l5%205%205-5z%22%2F%3E%3C%2Fsvg%3E")`,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                              }}
                              title="Click to quickly change status"
                            >
                              {STATUS_OPTIONS.map((opt, optIdx) => (
                                <option 
                                  key={optIdx} 
                                  value={opt}
                                  style={{
                                    background: '#ffffff',
                                    color: '#1f2937',
                                    fontWeight: '500',
                                    padding: '6px'
                                  }}
                                >
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                    </td>
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
                            onClick={() => handleEdit(p)}
                            style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                          >
                            <Edit size={14} /> Edit
                          </button>
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
                  <td colSpan="15" style={{ textAlign: 'center', padding: '2rem' }}>No records found matching your search.</td>
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

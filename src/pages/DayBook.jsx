import React, { useState, useEffect, useRef } from 'react';
import { fetchProjects, createProject, updateProject, deleteProject } from '../api/frappeClient';
import { Plus, Save, X, MoreVertical, Edit, Download, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const DayBook = () => {
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
    sl_no: '', customer_name: '', job_card: '', model_name: '',
    consumption: '', warranty: '', cash: '', bank: '', credit: '',
    cost: '', profit: ''
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
        company: user?.role === 'admin' ? 'INEX' : (user?.name || 'INEX'),
        status: 'Open',
        custom_model_name: formData.model_name,
        total_billed_amount: parseFloat(formData.profit) || 0,
        total_costing_amount: parseFloat(formData.cost) || 0,
        notes: `Consumption: ${formData.consumption}\nWarranty: ${formData.warranty}\nCash: ${formData.cash}\nBank: ${formData.bank}\nCredit: ${formData.credit}`
      };
      
      if (editProjectId) {
        await updateProject(editProjectId, projectData);
        toast.success("DayBook Entry Updated!");
      } else {
        await createProject(projectData);
        toast.success("DayBook Entry Created!");
      }
      
      await loadData();
      setIsAdding(false);
      setEditProjectId(null);
      setFormData({
        sl_no: '', customer_name: '', job_card: '', model_name: '',
        consumption: '', warranty: '', cash: '', bank: '', credit: '',
        cost: '', profit: ''
      });
    } catch (e) {
      toast.error(editProjectId ? "Failed to update in Frappe." : "Failed to save to Frappe.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (project) => {
    const nameParts = (project.project_name || '').trim().split(/\s+/);
    const code = nameParts[0] || '';
    const name = nameParts.slice(1).join(' ') || '';

    setFormData({
      sl_no: project.name || '',
      customer_name: name,
      job_card: code,
      model_name: project.custom_model_name || '',
      consumption: extractNote(project.notes, 'Consumption'),
      warranty: extractNote(project.notes, 'Warranty'),
      cash: extractNote(project.notes, 'Cash'),
      bank: extractNote(project.notes, 'Bank'),
      credit: extractNote(project.notes, 'Credit'),
      cost: project.total_costing_amount || '',
      profit: project.total_billed_amount || ''
    });
    setEditProjectId(project.name);
    setIsAdding(true);
    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (projectId) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await deleteProject(projectId);
        toast.success("Entry deleted successfully!");
        setOpenMenuId(null);
        await loadData();
      } catch (error) {
        toast.error("Failed to delete entry from Frappe.");
      }
    }
  };

  const generatePDF = (project) => {
    const nameParts = (project.project_name || '').trim().split(/\s+/);
    const jobCard = nameParts[0] || '';
    const customerName = nameParts.slice(1).join(' ') || '';
    const doc = new jsPDF();
    
    // Add Logo
    const img = new Image();
    img.src = '/INEX final logo-04.png';
    img.onload = () => {
      // Draw Logo on the left side
      // x=14, y=10, width=40, height=20 (Adjusted to maintain some aspect ratio/size)
      doc.addImage(img, 'PNG', 14, 10, 50, 25);
      finishPDF();
    };
    img.onerror = () => {
      // Proceed without logo
      finishPDF();
    }

    const finishPDF = () => {
      doc.setLineWidth(0.5);
      doc.line(14, 38, 196, 38);

      // Customer Details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECEIPT / BILL", 14, 48);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 48);
      
      doc.text(`Job Card No: ${jobCard}`, 14, 58);
      doc.text(`Customer Name: ${customerName}`, 14, 65);
      
      // Table Data
      const tableData = [
        ["Model Name", project.custom_model_name || '-'],
        ["Consumption", extractNote(project.notes, 'Consumption') || '-'],
        ["Warranty", extractNote(project.notes, 'Warranty') || '-'],
        ["Cash Paid", extractNote(project.notes, 'Cash') || '-'],
        ["Bank Paid", extractNote(project.notes, 'Bank') || '-'],
        ["Credit", extractNote(project.notes, 'Credit') || '-']
      ];

      autoTable(doc, {
        startY: 75,
        head: [['Description', 'Details']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
      });

      const finalY = doc.lastAutoTable.finalY || 75;
      
      // Total Amount
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Amount: Rs. ${project.total_billed_amount || '0'}`, 140, finalY + 15);

      // Footer
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your business!", 105, 280, { align: 'center' });
      
      doc.save(`INEX_Bill_${jobCard}.pdf`);
      setOpenMenuId(null);
    };
  };

  const extractNote = (notes, key) => {
    if(!notes) return '';
    const match = notes.match(new RegExp(`${key}:\\s*(.*)`));
    return match ? match[1] : '';
  };

  // Filter projects based on search term and user role and Day Book constraints
  const filteredProjects = projects.filter(p => {
    // Only include if it has sale/payment data (Day Book Entry logic)
    const hasDayBookData = p.total_billed_amount > 0 || p.total_costing_amount > 0 || 
                           extractNote(p.notes, 'Cash') !== '' || extractNote(p.notes, 'Bank') !== '' || extractNote(p.notes, 'Credit') !== '';
    if (!hasDayBookData) return false;

    // Branch Filter: Branches only see their own records. Admins see all.
    if (user?.role === 'branch' && p.company !== user?.name) return false;
    
    // Admin branch filter dropdown
    if (user?.role === 'admin' && filterBranch !== 'All' && p.company !== filterBranch) return false;

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
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill logic when typing Code
    if (field === 'job_card' && value.trim().length >= 4) {
      const match = projects.find(p => {
        const code = (p.project_name || '').trim().split(/\s+/)[0];
        return code.toLowerCase() === value.trim().toLowerCase();
      });

      if (match) {
        const nameParts = (match.project_name || '').trim().split(/\s+/);
        const name = nameParts.slice(1).join(' ') || '';
        
        setFormData(prev => {
          const next = { ...prev };
          if (!prev.customer_name && name) next.customer_name = name;
          if (!prev.model_name && match.custom_model_name) next.model_name = match.custom_model_name;
          return next;
        });
        
        // This makes sure we update the existing job card instead of creating a duplicate!
        setEditProjectId(match.name);
      } else {
        setEditProjectId(null);
      }
    }
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
          <h3 style={{ marginBottom: '1.5rem' }}>{editProjectId ? 'Edit Day Book Entry' : 'New Day Book Entry'}</h3>
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
              <Save size={18} /> {isSaving ? 'Saving...' : (editProjectId ? 'Update Entry' : 'Save to Frappe')}
            </button>
            <button className="btn" style={{ background: 'rgba(0,0,0,0.05)' }} onClick={() => { setIsAdding(false); setEditProjectId(null); handleClear(); }}>
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
                            minWidth: '140px',
                            overflow: 'hidden'
                          }}
                        >
                          <button 
                            onClick={() => handleEdit(p)}
                            style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f3f5', fontSize: '0.85rem' }}
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button 
                            onClick={() => generatePDF(p)}
                            style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f3f5', fontSize: '0.85rem' }}
                          >
                            <Download size={14} /> Download PDF
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

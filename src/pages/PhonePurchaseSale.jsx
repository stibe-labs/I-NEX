import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchProjects, 
  fetchPurchaseReceipts, 
  fetchSalesInvoices,
  createPurchaseReceipt, 
  createSalesInvoice,
  updatePurchaseReceipt,
  ensureSupplier,
  ensureCustomer,
  ensureItem,
  deletePurchaseReceipt,
  deleteSalesInvoice
} from '../api/frappeClient';
import { Plus, Save, X, MoreVertical, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const PhonePurchaseSale = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' or 'sales'
  
  const [projects, setProjects] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    branch_project: '', // Stores project name (e.g. PROJ-0792)
    party_name: '', // Supplier for Purchases, Customer for Sales
    model: '',
    imei: '',
    amount: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, purchData, salesData] = await Promise.all([
        fetchProjects(),
        fetchPurchaseReceipts(),
        fetchSalesInvoices()
      ]);
      setProjects(projData);
      setPurchases(purchData);
      setSales(salesData);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter projects specifically created for Phone Purchase and Sales
  const phoneProjects = projects.filter(p => 
    (p.project_name && p.project_name.toLowerCase().includes('phone purchase and sales')) ||
    ['PROJ-0792', 'PROJ-0793', 'PROJ-0794'].includes(p.name)
  );

  // Helper to find branch project for branch portal user
  const getUserBranchProject = () => {
    return phoneProjects.find(p => 
      p.company === user?.name || 
      (p.project_name && p.project_name.toLowerCase().includes((user?.name || '').toLowerCase().replace('inex ', '')))
    );
  };

  // Available projects for admin to select in dropdown
  const availableProjects = phoneProjects;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    const defaultBranchProj = user?.role === 'admin' ? '' : (getUserBranchProject()?.name || '');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      branch_project: defaultBranchProj,
      party_name: '',
      model: '',
      imei: '',
      amount: ''
    });
    setEditId(null);
  };

  const handleOpenAdd = () => {
    const defaultBranchProj = user?.role === 'admin' ? '' : (getUserBranchProject()?.name || '');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      branch_project: defaultBranchProj,
      party_name: '',
      model: '',
      imei: '',
      amount: ''
    });
    setEditId(null);
    setIsAdding(true);
  };

  const handleSave = async () => {
    let targetProjectId = formData.branch_project;
    if (!targetProjectId && user?.role !== 'admin') {
      targetProjectId = getUserBranchProject()?.name;
    }

    if (!targetProjectId) {
      toast.error(user?.role === 'admin' ? "Please select a Branch (Project)" : "Branch project not found for your account");
      return;
    }
    if (!formData.party_name) {
      toast.error(activeTab === 'purchases' ? "Supplier Name is required" : "Customer Name is required");
      return;
    }
    if (!formData.model) {
      toast.error("Model is required");
      return;
    }

    setIsSaving(true);
    try {
      const project = projects.find(p => p.name === targetProjectId);
      if (!project) throw new Error("Invalid Branch Project selected");

      const company = project.company || (user?.role === 'branch' ? user?.name : 'INEX');
      const itemCode = await ensureItem(formData.model, `IMEI: ${formData.imei}`);
      const rate = parseFloat(formData.amount) || 0;
      const remarks = `Model: ${formData.model}\nIMEI Number: ${formData.imei}`;

      if (activeTab === 'purchases') {
        const supplierName = await ensureSupplier(formData.party_name);
        const invoiceData = {
          supplier: supplierName,
          project: project.name,
          company: company,
          posting_date: formData.date,
          items: [{
            item_code: itemCode,
            qty: 1,
            rate: rate,
            description: `Model: ${formData.model}, IMEI: ${formData.imei}`,
            project: project.name
          }],
          remarks: remarks
        };

        if (editId) {
          await updatePurchaseReceipt(editId, invoiceData);
          toast.success("Purchase Updated!");
        } else {
          await createPurchaseReceipt(invoiceData);
          toast.success("Purchase Saved!");
        }
      } else {
        const customerName = await ensureCustomer(formData.party_name);
        const invoiceData = {
          customer: customerName,
          project: project.name,
          company: company,
          posting_date: formData.date,
          items: [{
            item_code: itemCode,
            qty: 1,
            rate: rate,
            description: `Model: ${formData.model}, IMEI: ${formData.imei}`,
            project: project.name
          }],
          remarks: remarks
        };

        await createSalesInvoice(invoiceData);
        toast.success("Sale Saved!");
      }

      await loadData();
      setIsAdding(false);
      handleClear();
    } catch (e) {
      toast.error(e.message || `Failed to save ${activeTab.slice(0, -1)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        if (activeTab === 'purchases') {
          await deletePurchaseReceipt(id);
        } else {
          await deleteSalesInvoice(id);
        }
        toast.success("Entry deleted successfully!");
        setOpenMenuId(null);
        await loadData();
      } catch (error) {
        toast.error(error.message || "Failed to delete entry from Frappe.");
      }
    }
  };

  const extractIMEI = (remarks) => {
    if (!remarks) return '-';
    const match = remarks.match(/IMEI Number:\s*([^\n\r]+)/i);
    return match ? match[1].trim() : '-';
  };

  const getModelFromRemarks = (remarks) => {
    if (!remarks) return '-';
    const match = remarks.match(/Model:\s*([^\n\r]+)/i);
    return match ? match[1].trim() : '-';
  };

  // Filter records so that ONLY Phone Purchase & Sales records are shown
  const filterRecords = (records) => {
    const phoneProjectNames = phoneProjects.map(p => p.name);
    return records.filter(record => {
      // Must be linked to a phone purchase & sales project or have IMEI remarks
      const isPhoneRecord = phoneProjectNames.includes(record.project) || 
                            (record.remarks && /IMEI Number:/i.test(record.remarks));
      if (!isPhoneRecord) return false;

      const recordProject = projects.find(p => p.name === record.project);

      // Role filtering for branch users
      if (user?.role === 'branch') {
        const branchMatch = recordProject 
          ? (recordProject.company === user?.name || record.company === user?.name) 
          : record.company === user?.name;
        if (!branchMatch) return false;
      }
      
      // Admin branch filter
      if (user?.role === 'admin' && filterBranch !== 'All') {
        const branchMatch = recordProject 
          ? (recordProject.company === filterBranch || record.company === filterBranch) 
          : record.company === filterBranch;
        if (!branchMatch) return false;
      }

      // Search term
      const term = searchTerm.toLowerCase();
      const party = (record.supplier || record.customer || '').toLowerCase();
      const imei = extractIMEI(record.remarks).toLowerCase();
      const model = getModelFromRemarks(record.remarks).toLowerCase();

      return party.includes(term) || imei.includes(term) || model.includes(term);
    });
  };

  const displayRecords = filterRecords(activeTab === 'purchases' ? purchases : sales);
  const availableBranchFilters = Array.from(new Set(phoneProjects.map(p => p.company))).filter(Boolean);

  return (
    <div>
      {/* Page Header without the phone icon */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Phone Purchase & Sale</h1>
        {!isAdding && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} /> New Entry
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${activeTab === 'purchases' ? 'btn-primary' : ''}`}
          style={activeTab !== 'purchases' ? { background: 'transparent', color: '#666', border: 'none', boxShadow: 'none' } : {}}
          onClick={() => { setActiveTab('purchases'); setIsAdding(false); }}
        >
          Purchases
        </button>
        <button 
          className={`btn ${activeTab === 'sales' ? 'btn-primary' : ''}`}
          style={activeTab !== 'sales' ? { background: 'transparent', color: '#666', border: 'none', boxShadow: 'none' } : {}}
          onClick={() => { setActiveTab('sales'); setIsAdding(false); }}
        >
          Sales
        </button>
      </div>

      {/* New Entry Form */}
      {isAdding && (
        <div className="glass-card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', textTransform: 'capitalize' }}>New {activeTab.slice(0, -1)} Entry</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            <div className="input-group">
              <label>Date</label>
              <input type="date" className="input-field" value={formData.date} onChange={e => handleInputChange('date', e.target.value)} required />
            </div>

            {/* Admin sees dropdown to pick branch project; Branch user gets default set automatically */}
            {user?.role === 'admin' ? (
              <div className="input-group">
                <label>Branch (Project)</label>
                <select 
                  className="input-field" 
                  value={formData.branch_project} 
                  onChange={e => handleInputChange('branch_project', e.target.value)}
                  required
                >
                  <option value="">Select Branch Project</option>
                  {availableProjects.map((p, i) => (
                    <option key={i} value={p.name}>{p.project_name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="input-group">
                <label>Branch (Project)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={getUserBranchProject()?.project_name || 'Loading Project...'} 
                  readOnly 
                  style={{ background: '#f8f9fa', cursor: 'not-allowed', color: '#666' }} 
                />
              </div>
            )}

            <div className="input-group">
              <label>{activeTab === 'purchases' ? 'Supplier Name' : 'Customer Name'}</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder={activeTab === 'purchases' ? 'Enter Supplier Name' : 'Enter Customer Name'}
                value={formData.party_name} 
                onChange={e => handleInputChange('party_name', e.target.value)} 
                required 
              />
            </div>

            <div className="input-group">
              <label>Model</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. iPhone 15 Pro, Samsung S24"
                value={formData.model} 
                onChange={e => handleInputChange('model', e.target.value)} 
                required 
              />
            </div>

            <div className="input-group">
              <label>IMEI Number</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="15-digit IMEI"
                value={formData.imei} 
                onChange={e => handleInputChange('imei', e.target.value)} 
              />
            </div>

            <div className="input-group">
              <label>Amount</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="0.00"
                value={formData.amount} 
                onChange={e => handleInputChange('amount', e.target.value)} 
                required 
              />
            </div>

          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Entry'}
            </button>
            <button className="btn" style={{ background: 'rgba(0,0,0,0.05)' }} onClick={() => { setIsAdding(false); handleClear(); }}>
              <X size={18} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          {user?.role === 'admin' && (
            <select 
              className="input-field" 
              style={{ width: 'auto', minWidth: '160px' }}
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
            >
              <option value="All">All Branches</option>
              {availableBranchFilters.map((branch, i) => (
                <option key={i} value={branch}>{branch}</option>
              ))}
            </select>
          )}
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search Model, IMEI, Name..." 
            style={{ width: '100%', maxWidth: '300px' }}
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
                <th>BRANCH (PROJECT)</th>
                <th>{activeTab === 'purchases' ? 'SUPPLIER NAME' : 'CUSTOMER NAME'}</th>
                <th>MODEL</th>
                <th>IMEI NUMBER</th>
                <th>AMOUNT</th>
                <th style={{ width: '50px', textAlign: 'center' }}>ACT.</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.map((r, i) => {
                const projName = projects.find(p => p.name === r.project)?.project_name || r.project || '-';
                
                const dateObj = new Date(r.posting_date);
                const dateString = isNaN(dateObj) ? '' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                
                const party = activeTab === 'purchases' ? r.supplier : r.customer;
                
                return (
                  <tr key={r.name || i}>
                    <td>{dateString}</td>
                    <td style={{ fontWeight: 600 }}>{projName}</td>
                    <td>{party || '-'}</td>
                    <td>{getModelFromRemarks(r.remarks)}</td>
                    <td>{extractIMEI(r.remarks)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{r.grand_total || '-'}</td>
                    <td style={{ position: 'relative' }}>
                      <button 
                        className="btn-icon" 
                        onClick={() => setOpenMenuId(openMenuId === r.name ? null : r.name)}
                        style={{ padding: '0.25rem', background: 'transparent' }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === r.name && (
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
                            minWidth: '100px',
                            overflow: 'hidden'
                          }}
                        >
                          <button 
                            onClick={() => handleDelete(r.name)}
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
              {displayRecords.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No phone {activeTab} records found. Click <strong>+ New Entry</strong> to add one.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PhonePurchaseSale;

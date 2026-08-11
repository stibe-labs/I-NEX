import React, { useState, useEffect, useRef } from 'react';
import { fetchProjects, createPurchaseInvoice, fetchPurchaseInvoices, ensureSupplier, ensureItem } from '../api/frappeClient';
import { Plus, Save, X, MoreVertical, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const PurchaseOrder = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Note: We don't implement full edit/delete for Frappe invoices here 
  // as Frappe handles submitted invoices strictly. But we add the UI structure.
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Form State matching requested inputs
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    code: '',
    supplier_name: '',
    item_description: '',
    qty: '',
    purchase_price: '',
    total_amount: '',
    mode_of_payment: '',
    remarks: '',
    branch: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, invData] = await Promise.all([
        fetchProjects(),
        fetchPurchaseInvoices()
      ]);
      setProjects(projData);
      setPurchases(invData);
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

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      
      // Auto-calculate Total Amount
      if (field === 'qty' || field === 'purchase_price') {
         const qty = parseFloat(field === 'qty' ? value : prev.qty) || 0;
         const price = parseFloat(field === 'purchase_price' ? value : prev.purchase_price) || 0;
         next.total_amount = (qty * price).toFixed(2);
      }

      // Auto-fetch Project/Customer logic (just to validate project exists if needed)
      // The user just wants CODE. We will link to project if it exists.
      if (field === 'code' && value.trim().length > 0) {
        const match = projects.find(p => {
          const pCode = (p.project_name || '').trim().split(/\s+/)[0];
          return pCode.toLowerCase() === value.trim().toLowerCase();
        });
        if (match && user?.role === 'admin') {
            next.branch = match.company || next.branch;
        }
      }

      return next;
    });
  };

  const extractNote = (notes, key) => {
    if (!notes) return '';
    const plainText = notes.replace(/<[^>]*>?/gm, '\n');
    const match = plainText.match(new RegExp(`${key}:[ \\t]*(.*)`));
    return match ? match[1].trim() : '';
  };

  const handleSave = async () => {
    if (!formData.code) {
      toast.error("CODE is required");
      return;
    }
    if (!formData.supplier_name) {
      toast.error("Supplier Name is required");
      return;
    }

    setIsSaving(true);
    try {
      // Find the project ID based on CODE
      let projectId = '';
      const match = projects.find(p => {
        const pCode = (p.project_name || '').trim().split(/\s+/)[0];
        return pCode.toLowerCase() === formData.code.trim().toLowerCase();
      });
      if (match) {
          projectId = match.name;
      } else {
          // If project doesn't exist, you might need to create it or skip project link.
          // We'll leave project empty if not found, or Frappe might throw an error if mandatory.
          // Assuming user types a valid code.
      }

      const supplierName = await ensureSupplier(formData.supplier_name);
      const itemCode = await ensureItem(formData.code);
      
      const qty = parseFloat(formData.qty) || 1;
      const rate = parseFloat(formData.purchase_price) || 0;

      // Pack details into remarks for easy fetching
      const packedRemarks = `Item Description: ${formData.item_description}\nQuantity: ${qty}\nPurchase Price: ${rate}\nMode of Payment: ${formData.mode_of_payment}\nRemarks: ${formData.remarks}`;

      const invoiceData = {
        supplier: supplierName,
        project: projectId,
        company: user?.role === 'admin' ? (formData.branch || 'INEX') : (user?.name || 'INEX'),
        posting_date: formData.date,
        items: [
            {
                item_code: itemCode,
                qty: qty,
                rate: rate,
                description: formData.item_description || 'Purchase Item',
                project: projectId
            }
        ],
        remarks: packedRemarks
      };

      await createPurchaseInvoice(invoiceData);
      toast.success("Purchase Entry Saved to Frappe!");
      
      await loadData();
      setIsAdding(false);
      handleClear();
    } catch (e) {
      toast.error(e.message || "Failed to save Purchase Entry");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      code: '',
      supplier_name: '',
      item_description: '',
      qty: '',
      purchase_price: '',
      total_amount: '',
      mode_of_payment: '',
      remarks: '',
      branch: user?.role === 'admin' ? '' : (user?.name || 'INEX')
    });
  };

  const filteredPurchases = purchases.filter(p => {
    if (user?.role === 'branch' && p.company !== user?.name) return false;
    if (user?.role === 'admin' && filterBranch !== 'All' && p.company !== filterBranch) return false;

    const term = searchTerm.toLowerCase();
    // Reconstruct Code from project if possible
    let code = '';
    if (p.project) {
        const matchProj = projects.find(proj => proj.name === p.project);
        if (matchProj) {
            code = (matchProj.project_name || '').trim().split(/\s+/)[0];
        }
    }
    const supplierStr = (p.supplier || '').toLowerCase();
    const codeStr = code.toLowerCase();
    
    return supplierStr.includes(term) || codeStr.includes(term);
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Purchase Order</h1>
        {!isAdding && (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={18} /> New Entry
          </button>
        )}
      </div>

      {isAdding && (
        <div className="glass-card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>New Purchase Entry</h3>
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
              <label>Date</label>
              <input type="date" className="input-field" value={formData.date} onChange={e => handleInputChange('date', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>CODE</label>
              <input type="text" className="input-field" value={formData.code} onChange={e => handleInputChange('code', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Supplier Name</label>
              <input type="text" className="input-field" value={formData.supplier_name} onChange={e => handleInputChange('supplier_name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Item Description</label>
              <input type="text" className="input-field" value={formData.item_description} onChange={e => handleInputChange('item_description', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Quantity</label>
              <input type="number" className="input-field" value={formData.qty} onChange={e => handleInputChange('qty', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Purchase Price (Per Unit)</label>
              <input type="number" className="input-field" value={formData.purchase_price} onChange={e => handleInputChange('purchase_price', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Total Amount</label>
              <input type="number" className="input-field" value={formData.total_amount} readOnly style={{ background: '#f8f9fa' }} />
            </div>
            <div className="input-group">
              <label>Mode of Payment</label>
              <input type="text" className="input-field" value={formData.mode_of_payment} onChange={e => handleInputChange('mode_of_payment', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Remarks</label>
              <input type="text" className="input-field" value={formData.remarks} onChange={e => handleInputChange('remarks', e.target.value)} />
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          {user?.role === 'admin' && (
            <select 
              className="input-field" 
              style={{ width: 'auto', minWidth: '150px' }}
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
            >
              <option value="All">All Branches</option>
              {Array.from(new Set(purchases.map(p => p.company))).filter(Boolean).map((branch, i) => (
                <option key={i} value={branch}>{branch}</option>
              ))}
            </select>
          )}
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by Code or Supplier..." 
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
                <th>SUPPLIER NAME</th>
                <th>ITEM DESCRIPTION</th>
                <th>QTY</th>
                <th>PRICE/UNIT</th>
                <th>TOTAL AMOUNT</th>
                <th>MODE OF PAYMENT</th>
                <th>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((p, i) => {
                let code = '-';
                if (p.project) {
                    const matchProj = projects.find(proj => proj.name === p.project);
                    if (matchProj) code = (matchProj.project_name || '').trim().split(/\s+/)[0];
                }
                
                const dateObj = new Date(p.posting_date);
                const dateString = isNaN(dateObj) ? '' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

                return (
                  <tr key={p.name || i}>
                    <td>{dateString}</td>
                    <td style={{ fontWeight: 600 }}>{code}</td>
                    <td>{p.supplier || '-'}</td>
                    <td>{extractNote(p.remarks, 'Item Description') || '-'}</td>
                    <td>{extractNote(p.remarks, 'Quantity') || '-'}</td>
                    <td>{extractNote(p.remarks, 'Purchase Price') || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{p.grand_total || '-'}</td>
                    <td>{extractNote(p.remarks, 'Mode of Payment') || '-'}</td>
                    <td>{extractNote(p.remarks, 'Remarks') || '-'}</td>
                  </tr>
                );
              })}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No records found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrder;

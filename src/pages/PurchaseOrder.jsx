import React, { useState, useEffect, useRef } from 'react';
import { fetchProjects, createPurchaseReceipt, fetchPurchaseReceipts, ensureSupplier, ensureItem, createProject, updatePurchaseReceipt, deletePurchaseReceipt } from '../api/frappeClient';
import { Plus, Save, X, MoreVertical, Edit, Trash2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const PurchaseOrder = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState(null);
  
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
    customer_name: '',
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
        fetchPurchaseReceipts()
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
        if (match) {
            if (user?.role === 'admin') {
                next.branch = match.company || next.branch;
            }
            const nameParts = (match.project_name || '').trim().split(/\s+/);
            next.customer_name = nameParts.slice(1).join(' ') || '';
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
    if (!formData.code || !formData.customer_name) {
      toast.error("CODE and Customer Name are required");
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
          // Create new Project if not found
          const projectName = `${formData.code} ${formData.customer_name}`;
          const projectData = {
              project_name: projectName,
              company: user?.role === 'admin' ? (formData.branch || 'INEX') : (user?.name || 'INEX'),
              status: 'Completed',
          };
          const createdProj = await createProject(projectData);
          projectId = createdProj.name;
      }

      const supplierName = await ensureSupplier(formData.supplier_name);
      const itemCode = await ensureItem(formData.code, formData.item_description);
      
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

      if (editInvoiceId) {
        await updatePurchaseReceipt(editInvoiceId, invoiceData);
        toast.success("Purchase Entry Updated!");
      } else {
        await createPurchaseReceipt(invoiceData);
        toast.success("Purchase Entry Saved to Frappe!");
      }
      
      await loadData();
      setIsAdding(false);
      setEditInvoiceId(null);
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
      customer_name: '',
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

  const handleEdit = (invoice, code, custName) => {
    setFormData({
      date: invoice.posting_date || new Date().toISOString().split('T')[0],
      code: code,
      customer_name: custName,
      supplier_name: invoice.supplier || '',
      item_description: extractNote(invoice.remarks, 'Item Description') || '',
      qty: extractNote(invoice.remarks, 'Quantity') || '',
      purchase_price: extractNote(invoice.remarks, 'Purchase Price') || '',
      total_amount: invoice.grand_total || '',
      mode_of_payment: extractNote(invoice.remarks, 'Mode of Payment') || '',
      remarks: extractNote(invoice.remarks, 'Remarks') || '',
      branch: invoice.company || ''
    });
    setEditInvoiceId(invoice.name);
    setIsAdding(true);
    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (invoiceId) => {
    if (window.confirm("Are you sure you want to delete this purchase entry?")) {
      try {
        await deletePurchaseReceipt(invoiceId);
        toast.success("Entry deleted successfully!");
        setOpenMenuId(null);
        await loadData();
      } catch (error) {
        toast.error(error.message || "Failed to delete entry from Frappe.");
      }
    }
  };

  const generatePDF = (invoice, code, custName) => {
    const doc = new jsPDF();
    const img = new Image();
    img.src = '/INEX final logo-04.png';
    img.onload = () => {
      doc.addImage(img, 'PNG', 14, 10, 50, 25);
      finishPDF();
    };
    img.onerror = () => finishPDF();

    const finishPDF = () => {
      doc.setLineWidth(0.5);
      doc.line(14, 38, 196, 38);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PURCHASE ORDER", 14, 48);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const dateObj = new Date(invoice.posting_date);
      const dateString = isNaN(dateObj) ? '' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
      
      doc.text(`Date: ${dateString}`, 150, 48);
      doc.text(`Job Card No: ${code}`, 14, 58);
      doc.text(`Customer Name: ${custName}`, 14, 65);
      doc.text(`Supplier Name: ${invoice.supplier || '-'}`, 14, 72);
      
      const tableData = [
        ["Item Description", extractNote(invoice.remarks, 'Item Description') || '-'],
        ["Quantity", extractNote(invoice.remarks, 'Quantity') || '-'],
        ["Purchase Price", extractNote(invoice.remarks, 'Purchase Price') || '-'],
        ["Mode of Payment", extractNote(invoice.remarks, 'Mode of Payment') || '-'],
        ["Remarks", extractNote(invoice.remarks, 'Remarks') || '-']
      ];

      autoTable(doc, {
        startY: 82,
        head: [['Description', 'Details']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
      });

      const finalY = doc.lastAutoTable.finalY || 82;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Amount: Rs. ${invoice.grand_total || '0'}`, 140, finalY + 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your business!", 105, 280, { align: 'center' });
      
      doc.save(`INEX_Purchase_${code}.pdf`);
      setOpenMenuId(null);
    };
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

  const uniqueSuppliers = Array.from(new Set(purchases.map(p => p.supplier).filter(Boolean)));

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
                  {Array.from(new Set(['INEX Thodupuzha', 'INEX Kaloor', 'INEX Perumbavoor', ...projects.map(p => p.company)])).filter(Boolean).filter(b => b !== 'INEX' && b !== 'INEX Accessories').map((branch, i) => (
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
              <label>Customer Name</label>
              <input type="text" className="input-field" value={formData.customer_name} onChange={e => handleInputChange('customer_name', e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Supplier Name</label>
              <input type="text" className="input-field" list="supplier-list" value={formData.supplier_name} onChange={e => handleInputChange('supplier_name', e.target.value)} required />
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
          
          <datalist id="supplier-list">
            {uniqueSuppliers.map((supp, i) => (
              <option key={i} value={supp} />
            ))}
          </datalist>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : (editInvoiceId ? 'Update Entry' : 'Save to Frappe')}
            </button>
            <button className="btn" style={{ background: 'rgba(0,0,0,0.05)' }} onClick={() => { setIsAdding(false); setEditInvoiceId(null); handleClear(); }}>
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
              {Array.from(new Set(['INEX Thodupuzha', 'INEX Kaloor', 'INEX Perumbavoor', ...purchases.map(p => p.company)])).filter(Boolean).filter(b => b !== 'INEX' && b !== 'INEX Accessories').map((branch, i) => (
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
                <th>CUSTOMER NAME</th>
                <th>SUPPLIER NAME</th>
                <th>ITEM DESCRIPTION</th>
                <th>QTY</th>
                <th>PRICE/UNIT</th>
                <th>TOTAL AMOUNT</th>
                <th>MODE OF PAYMENT</th>
                <th>REMARKS</th>
                <th style={{ width: '50px', textAlign: 'center' }}>ACT.</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((p, i) => {
                let code = '-';
                let custName = '-';
                if (p.project) {
                    const matchProj = projects.find(proj => proj.name === p.project);
                    if (matchProj) {
                        const nameParts = (matchProj.project_name || '').trim().split(/\s+/);
                        code = nameParts[0] || '';
                        custName = nameParts.slice(1).join(' ') || '';
                    }
                }
                
                const dateObj = new Date(p.posting_date);
                const dateString = isNaN(dateObj) ? '' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

                return (
                  <tr key={p.name || i}>
                    <td>{dateString}</td>
                    <td style={{ fontWeight: 600 }}>{code}</td>
                    <td>{custName}</td>
                    <td>{p.supplier || '-'}</td>
                    <td>{extractNote(p.remarks, 'Item Description') || '-'}</td>
                    <td>{extractNote(p.remarks, 'Quantity') || '-'}</td>
                    <td>{extractNote(p.remarks, 'Purchase Price') || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{p.grand_total || '-'}</td>
                    <td>{extractNote(p.remarks, 'Mode of Payment') || '-'}</td>
                    <td>{extractNote(p.remarks, 'Remarks') || '-'}</td>
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
                            onClick={() => handleEdit(p, code, custName)}
                            style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f3f5', fontSize: '0.85rem' }}
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button 
                            onClick={() => generatePDF(p, code, custName)}
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
              {filteredPurchases.length === 0 && (
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

export default PurchaseOrder;

import React, { useState, useEffect, useRef } from 'react';
import { fetchProjects, createPurchaseInvoice, checkPurchaseInvoiceExists, ensureSupplier, ensureItem } from '../api/frappeClient';
import { Plus, Save, X, Trash2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../App';

const PurchaseOrder = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    jobCardCode: '',
    customerName: '',
    projectId: '', // The actual project name in Frappe
    vendorName: '',
    vendorAddress: '',
    contactPerson: '',
    contactNo: '',
    preparedBy: user?.name || '',
    checkedBy: '',
    approvedBy: '',
    branch: user?.role === 'admin' ? '' : (user?.name || 'INEX')
  });

  const [lineItems, setLineItems] = useState([
    { id: 1, particulars: '', qty: 1, rate: 0, amount: 0 }
  ]);

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-fill logic when typing Job Card Code
    if (field === 'jobCardCode' && value.trim().length > 0) {
      const match = projects.find(p => {
        const code = (p.project_name || '').trim().split(/\s+/)[0];
        return code.toLowerCase() === value.trim().toLowerCase();
      });

      if (match) {
        const nameParts = (match.project_name || '').trim().split(/\s+/);
        const name = nameParts.slice(1).join(' ') || '';
        
        setFormData(prev => ({
          ...prev,
          customerName: name || '',
          projectId: match.name,
          branch: match.company || prev.branch // default to project's branch if admin
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          customerName: '',
          projectId: ''
        }));
      }
    }
  };

  const addLineItem = () => {
    const newId = lineItems.length > 0 ? Math.max(...lineItems.map(item => item.id)) + 1 : 1;
    setLineItems([...lineItems, { id: newId, particulars: '', qty: 1, rate: 0, amount: 0 }]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    } else {
      toast.error("Must have at least one line item");
    }
  };

  const handleLineItemChange = (id, field, value) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-calculate amount
        if (field === 'qty' || field === 'rate') {
          const qty = parseFloat(field === 'qty' ? value : item.qty) || 0;
          const rate = parseFloat(field === 'rate' ? value : item.rate) || 0;
          updatedItem.amount = qty * rate;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculations
  const totalAmount = lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  
  // Basic Taxes for demonstration (can be made editable if needed)
  const cgst = 0; // totalAmount * 0.09;
  const sgst = 0; // totalAmount * 0.09;
  const igst = 0;
  const grandTotal = totalAmount + cgst + sgst + igst;

  const handleSave = async () => {
    if (!formData.jobCardCode || !formData.projectId) {
      toast.error("Valid Job Card Code linked to a Project is required");
      return;
    }
    if (!formData.vendorName) {
      toast.error("Vendor Name is required");
      return;
    }
    
    // Filter out empty items
    const validItems = lineItems.filter(item => item.particulars && item.qty > 0 && item.rate > 0);
    if (validItems.length === 0) {
      toast.error("At least one valid line item (with description, qty, and rate) is required");
      return;
    }

    setIsSaving(true);
    try {
      const supplierName = await ensureSupplier(formData.vendorName);
      
      const invoiceData = {
        supplier: supplierName,
        project: formData.projectId,
        company: user?.role === 'admin' ? (formData.branch || 'INEX') : (user?.name || 'INEX'),
        posting_date: formData.date,
        items: await Promise.all(validItems.map(async (item) => {
            const itemCode = await ensureItem(formData.jobCardCode);
            return {
                item_code: itemCode,
                qty: item.qty,
                rate: item.rate,
                description: item.particulars,
                project: formData.projectId
            }
        })),
        remarks: `Vendor Details: ${formData.vendorName}, Contact: ${formData.contactPerson} (${formData.contactNo})\nAddress: ${formData.vendorAddress}\nPrepared By: ${formData.preparedBy}, Checked By: ${formData.checkedBy}, Approved By: ${formData.approvedBy}`
      };

      await createPurchaseInvoice(invoiceData);
      toast.success("Purchase Order Saved to Frappe!");
      
      // Optionally print after save
      // generatePDF();
      
      handleClear();
    } catch (e) {
      toast.error(e.message || "Failed to save Purchase Order");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      jobCardCode: '',
      customerName: '',
      projectId: '',
      vendorName: '',
      vendorAddress: '',
      contactPerson: '',
      contactNo: '',
      preparedBy: user?.name || '',
      checkedBy: '',
      approvedBy: '',
      branch: user?.role === 'admin' ? '' : (user?.name || 'INEX')
    });
    setLineItems([{ id: 1, particulars: '', qty: 1, rate: 0, amount: 0 }]);
  };

  const generatePDF = () => {
    if (!formData.vendorName) {
       toast.error("Please fill Vendor details before printing.");
       return;
    }

    const doc = new jsPDF();
    
    // Add Logo
    const img = new Image();
    img.src = '/INEX final logo-04.png';
    img.onload = () => {
      doc.addImage(img, 'PNG', 14, 10, 50, 25);
      finishPDF();
    };
    img.onerror = () => {
      finishPDF();
    };

    const finishPDF = () => {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("PURCHASE FORMAT", 105, 25, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(14, 38, 196, 38);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      // Header Info
      doc.text(`Date: ${formData.date}`, 14, 45);
      doc.text(`CODE: ${formData.jobCardCode}`, 150, 45);
      
      // Vendor Info
      doc.text(`Supplier Name: ${formData.vendorName}`, 14, 52);
      doc.text(`Address: ${formData.vendorAddress}`, 14, 59);
      doc.text(`Contact Person: ${formData.contactPerson}`, 14, 66);
      doc.text(`Contact No: ${formData.contactNo}`, 14, 73);

      // Table
      const tableBody = lineItems.map((item, index) => [
        index + 1,
        item.particulars,
        item.qty,
        item.rate,
        item.amount
      ]);

      autoTable(doc, {
        startY: 80,
        head: [['S.NO', 'ITEM DESCRIPTION', 'QTY', 'PURCHASE PRICE', 'TOTAL AMOUNT']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 35 },
            4: { halign: 'right', cellWidth: 35 },
        },
        foot: [
            [{ content: 'Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: totalAmount.toFixed(2), styles: { halign: 'right', fontStyle: 'bold' } }],
            [{ content: 'CGST', colSpan: 4, styles: { halign: 'right' } }, { content: cgst.toFixed(2), styles: { halign: 'right' } }],
            [{ content: 'SGST', colSpan: 4, styles: { halign: 'right' } }, { content: sgst.toFixed(2), styles: { halign: 'right' } }],
            [{ content: 'IGST', colSpan: 4, styles: { halign: 'right' } }, { content: igst.toFixed(2), styles: { halign: 'right' } }],
            [{ content: 'Grand Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: grandTotal.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ]
      });

      const finalY = doc.lastAutoTable.finalY || 80;
      
      // Footer Signatures
      doc.setFontSize(10);
      doc.text(`Prepared By: ${formData.preparedBy}`, 14, finalY + 30);
      doc.text(`Checked By: ${formData.checkedBy}`, 80, finalY + 30);
      doc.text(`Approved By: ${formData.approvedBy}`, 150, finalY + 30);
      
      doc.save(`Purchase_Order_${formData.jobCardCode || 'New'}.pdf`);
    };
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Purchase Order</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || loading}>
             <Save size={18} /> {isSaving ? 'Saving...' : 'Save Purchase'}
           </button>
           <button className="btn" style={{ background: '#fff', border: '1px solid #ddd' }} onClick={generatePDF}>
             <Printer size={18} /> Print
           </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        
        {/* Top Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>General Details</h3>
                
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
                    <input type="date" className="input-field" value={formData.date} onChange={e => handleInputChange('date', e.target.value)} />
                </div>
                <div className="input-group">
                    <label>Job Card Code / Project</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" className="input-field" style={{ flex: 1 }} placeholder="Code" value={formData.jobCardCode} onChange={e => handleInputChange('jobCardCode', e.target.value)} required />
                        <input type="text" className="input-field" style={{ flex: 2 }} placeholder="Auto-fetched Name" value={formData.customerName} readOnly style={{ background: '#f8f9fa' }} />
                    </div>
                    {formData.jobCardCode && !formData.projectId && <small style={{color:'red'}}>Job card not found</small>}
                </div>
            </div>

            <div>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Vendor Details</h3>
                <div className="input-group">
                    <label>Supplier / Vendor Name</label>
                    <input type="text" className="input-field" value={formData.vendorName} onChange={e => handleInputChange('vendorName', e.target.value)} required />
                </div>
                <div className="input-group">
                    <label>Address</label>
                    <textarea className="input-field" style={{ resize: 'vertical', minHeight: '60px' }} value={formData.vendorAddress} onChange={e => handleInputChange('vendorAddress', e.target.value)}></textarea>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Contact Person</label>
                        <input type="text" className="input-field" value={formData.contactPerson} onChange={e => handleInputChange('contactPerson', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Contact No</label>
                        <input type="text" className="input-field" value={formData.contactNo} onChange={e => handleInputChange('contactNo', e.target.value)} />
                    </div>
                </div>
            </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '2rem 0' }} />

        {/* Line Items */}
        <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Line Items</h3>
            <div className="table-container" style={{ overflow: 'visible' }}>
                <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>S.NO</th>
                            <th>ITEM DESCRIPTION / PARTICULARS</th>
                            <th style={{ width: '100px' }}>QTY</th>
                            <th style={{ width: '150px' }}>PURCHASE PRICE</th>
                            <th style={{ width: '150px' }}>TOTAL AMOUNT</th>
                            <th style={{ width: '60px', textAlign: 'center' }}>ACT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineItems.map((item, index) => (
                            <tr key={item.id}>
                                <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                <td>
                                    <input type="text" className="input-field" style={{ padding: '0.5rem' }} value={item.particulars} onChange={e => handleLineItemChange(item.id, 'particulars', e.target.value)} placeholder="Item description..." />
                                </td>
                                <td>
                                    <input type="number" className="input-field" style={{ padding: '0.5rem', textAlign: 'center' }} value={item.qty} onChange={e => handleLineItemChange(item.id, 'qty', e.target.value)} min="1" />
                                </td>
                                <td>
                                    <input type="number" className="input-field" style={{ padding: '0.5rem', textAlign: 'right' }} value={item.rate} onChange={e => handleLineItemChange(item.id, 'rate', e.target.value)} min="0" step="0.01" />
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle' }}>
                                    {parseFloat(item.amount).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                    <button className="btn-icon" onClick={() => removeLineItem(item.id)} style={{ color: '#ff6b6b', background: 'transparent', padding: '0.25rem' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <button className="btn" style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.05)', fontSize: '0.85rem', padding: '0.5rem 1rem' }} onClick={addLineItem}>
                <Plus size={16} /> Add Row
            </button>
        </div>

        {/* Totals & Approvals */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <div>
                 <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Signatures / Approvals</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Prepared By</label>
                        <input type="text" className="input-field" value={formData.preparedBy} onChange={e => handleInputChange('preparedBy', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Checked By</label>
                        <input type="text" className="input-field" value={formData.checkedBy} onChange={e => handleInputChange('checkedBy', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Approved By</label>
                        <input type="text" className="input-field" value={formData.approvedBy} onChange={e => handleInputChange('approvedBy', e.target.value)} />
                    </div>
                 </div>
            </div>

            <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                    <span style={{ fontWeight: '600' }}>{totalAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>CGST:</span>
                    <span style={{ fontWeight: '500' }}>{cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>SGST:</span>
                    <span style={{ fontWeight: '500' }}>{sgst.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>IGST:</span>
                    <span style={{ fontWeight: '500' }}>{igst.toFixed(2)}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.1)', margin: '1rem 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Grand Total:</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--primary-color)' }}>{grandTotal.toFixed(2)}</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PurchaseOrder;

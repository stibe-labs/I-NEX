import React, { useState, useEffect, useRef } from 'react';
import { fetchProjects, createProject, updateProject, deleteProject, ensureCustomer, ensureItem, createSalesInvoice, checkSalesInvoiceExists, getLinkedSalesInvoices, cancelSalesInvoice, deleteSalesInvoice } from '../api/frappeClient';
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, project: null });
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
    cost: '', profit: '', branch: '', create_additional_invoice: false
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
      let actualEditProjectId = editProjectId;
      const projectName = `${formData.job_card} ${formData.customer_name}`;
      
      if (!actualEditProjectId) {
        // Fallback: If they manually typed an existing name, update it instead of crashing.
        // Use regex to normalize spaces so "1 Nithin " matches "1 Nithin"
        const normalize = (str) => (str || '').trim().replace(/\s+/g, ' ').toLowerCase();
        const match = projects.find(p => normalize(p.project_name) === normalize(projectName));
        if (match) actualEditProjectId = match.name;
      }

      const existingProject = actualEditProjectId ? projects.find(p => p.name === actualEditProjectId) : null;
      const existingNotes = existingProject?.notes || '';
      
      const complaint = extractNote(existingNotes, 'Complaint');
      const passcode = extractNote(existingNotes, 'Passcode');
      const receiver = extractNote(existingNotes, 'Receiver');
      const technician = extractNote(existingNotes, 'Technician');
      const source = extractNote(existingNotes, 'Source') || extractNote(existingNotes, 'Update');
      const delivery = extractNote(existingNotes, 'Delivery');
      
      const newNotes = `Complaint: ${complaint}\nPasscode: ${passcode}\nReceiver: ${receiver}\nTechnician: ${technician}\nSource: ${source}\nDelivery: ${delivery}\nConsumption: ${formData.consumption}\nWarranty: ${formData.warranty}\nCash: ${formData.cash}\nBank: ${formData.bank}\nCredit: ${formData.credit}\nCost: ${formData.cost}\nProfit: ${formData.profit}`;

      const projectData = {
        project_name: projectName,
        company: user?.role === 'admin' ? (formData.branch || 'INEX') : (user?.name || 'INEX'),
        status: 'Completed', // Once a Day Book sale is added, status is Completed
        custom_model_name: formData.model_name,
        notes: newNotes
      };
      
      let savedProjectId = actualEditProjectId;
      if (actualEditProjectId) {
        await updateProject(actualEditProjectId, projectData);
        toast.success("DayBook Entry Updated!");
      } else {
        const createdProj = await createProject(projectData);
        savedProjectId = createdProj.name;
        toast.success("DayBook Entry Created!");
      }

      // Automatically create a Sales Invoice for this DayBook entry
      try {
        const cashAmt = parseFloat(formData.cash) || 0;
        const bankAmt = parseFloat(formData.bank) || 0;
        const creditAmt = parseFloat(formData.credit) || 0;
        const totalAmount = cashAmt + bankAmt + creditAmt;
        
        // Only create invoice if there is some amount
        if (totalAmount > 0 && formData.customer_name) {
          const invoiceExists = await checkSalesInvoiceExists(savedProjectId);
          if (invoiceExists && !formData.create_additional_invoice) {
            console.log("Sales Invoice already exists for this project, skipping auto-creation.");
          } else {
            const custName = await ensureCustomer(formData.customer_name);
            const itemCode = await ensureItem(formData.job_card, formData.consumption);
            
            await createSalesInvoice({
              customer: custName,
              project: savedProjectId,
              company: projectData.company,
              items: [
                {
                  item_code: itemCode,
                  qty: 1,
                  rate: totalAmount,
                  project: savedProjectId,
                  description: `Model: ${formData.model_name || 'N/A'}\nConsumption: ${formData.consumption || 'N/A'}\nWarranty: ${formData.warranty || 'N/A'}\nCash: ${formData.cash || 0} | Bank: ${formData.bank || 0} | Credit: ${formData.credit || 0}\nCost: ${formData.cost || 0} | Profit: ${formData.profit || 0}`
                }
              ],
              remarks: `Automatically generated from Day Book Entry.\nCash: ${formData.cash || 0}, Bank: ${formData.bank || 0}, Credit: ${formData.credit || 0}\nCost: ${formData.cost || 0}, Profit: ${formData.profit || 0}`
            });
            toast.success("Sales Invoice Created Automatically!");
          }
        }
      } catch (invoiceErr) {
        console.error("Sales Invoice Auto-Creation Failed", invoiceErr);
        toast.error("DayBook saved, but " + (invoiceErr.message || "failed to automatically create Sales Invoice."));
      }
      
      await loadData();
      setIsAdding(false);
      setEditProjectId(null);
      setFormData({
        sl_no: '', customer_name: '', job_card: '', model_name: '',
        consumption: '', warranty: '', cash: '', bank: '', credit: '',
        cost: '', profit: '', branch: '', create_additional_invoice: false
      });
    } catch (e) {
      toast.error(e.message || (editProjectId ? "Failed to update in Frappe." : "Failed to save to Frappe."));
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
      cost: extractNote(project.notes, 'Cost') || project.total_costing_amount || '',
      profit: extractNote(project.notes, 'Profit') || project.total_billed_amount || '',
      branch: project.company || '',
      create_additional_invoice: false
    });
    setEditProjectId(project.name);
    setIsAdding(true);
    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (project) => {
    setDeleteModal({ isOpen: true, project });
    setOpenMenuId(null);
  };

  const confirmDelete = async () => {
    const project = deleteModal.project;
    if (!project) return;
    
    setIsDeleting(true);
    try {
      // 1. Find linked Sales Invoices
      const linkedInvoices = await getLinkedSalesInvoices(project.name);
      
      // 2. Cancel and Delete each invoice
      for (const invoice of linkedInvoices) {
        if (invoice.docstatus === 1) { // 1 = Submitted
          await cancelSalesInvoice(invoice.name);
        }
        await deleteSalesInvoice(invoice.name);
      }

      // 3. Delete Project
      await deleteProject(project.name);
      toast.success("Entry and linked invoice deleted successfully!");
      setDeleteModal({ isOpen: false, project: null });
      await loadData();
    } catch (error) {
      toast.error(error.message || "Failed to delete entry and linked invoice.");
    } finally {
      setIsDeleting(false);
    }
  };

  const generatePDF = (project) => {
    const nameParts = (project.project_name || '').trim().split(/\s+/);
    const jobCard = nameParts[0] || '';
    const customerName = nameParts.slice(1).join(' ') || '';
    const branchName = (project.company || '').toLowerCase().replace(/\s+/g, '');
    
    let phoneNoTop = '';
    let addressTop = '';
    let addressBottom = '';
    const email = 'inexcarekochi@gmail.com';

    if (branchName.includes('thodupuzha')) {
      phoneNoTop = '9633311255';
      addressTop = 'Oppo Jyothi super bazar, Near tee cee restaurant, Thodupuzha, 685588';
      addressBottom = 'Oppo Jyothi super bazar, Near tee cee restaurant, Thodupuzha, 685588';
    } else if (branchName.includes('kaloor')) {
      phoneNoTop = '9993335197';
      addressTop = 'iNex Metro pillar-585, near Lenin Center, Kaloor, Kochi, Kerala 682017';
      addressBottom = 'Metro Pillar-585, Kaloor, Kochi, Kerala 682017';
    } else if (branchName.includes('perumbavoor')) {
      phoneNoTop = '9993335196';
      addressTop = 'Oppo Crysta Hyper market, Am road, Perumbavoor ,683542';
      addressBottom = 'Oppo crysta Hyper market, Am road, Perumbavoor ,683542';
    } else {
      // Default
      phoneNoTop = '9993335197';
      addressTop = 'Premium Mobile & Laptop Service Center';
      addressBottom = 'Premium Mobile & Laptop Service Center';
    }

    const doc = new jsPDF();
    
    const img = new Image();
    img.src = '/INEX final logo-04.png';
    
    const drawContent = () => {
      // HEADER
      // Mobile No Block (Top Right)
      doc.setFillColor(0, 0, 0);
      doc.rect(130, 10, 70, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("MOBILE NO.", 165, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.text(String(phoneNoTop || ''), 165, 26, { align: 'center' });

      // Address Top
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("P R E M I U M   S E R V I C E   C E N T E R", 14, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(String(addressTop || ''), 14, 35);
      
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, 38, 196, 38);

      // INVOICE Header
      doc.setFillColor(29, 62, 137); // Dark Blue
      doc.rect(60, 45, 90, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", 105, 55, { align: 'center' });

      // Customer Info Box
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(14, 70, 182, 16); // Outer box
      doc.line(14, 78, 196, 78); // Horizontal separator
      doc.line(100, 70, 100, 86); // Vertical separator

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      const dateString = new Date().toLocaleDateString();
      const customerPhone = project.custom_phone || extractNote(project.notes, 'Phone') || '-';
      const warranty = extractNote(project.notes, 'Warranty') || '-';
      
      doc.setFont("helvetica", "bold");
      doc.text("Date :", 18, 75.5);
      doc.setFont("helvetica", "normal");
      doc.text(String(dateString || ''), 45, 75.5);

      doc.setFont("helvetica", "bold");
      doc.text("Customer Name :", 104, 75.5);
      doc.setFont("helvetica", "normal");
      doc.text(String(customerName || ''), 135, 75.5);

      doc.setFont("helvetica", "bold");
      doc.text("Warranty :", 18, 83.5);
      doc.setFont("helvetica", "normal");
      doc.text(String(warranty || ''), 45, 83.5);

      doc.setFont("helvetica", "bold");
      doc.text("Customer NO :", 104, 83.5);
      doc.setFont("helvetica", "normal");
      doc.text(String(jobCard || ''), 135, 83.5);

      // Items Table
      const tableStartY = 95;
      
      doc.setFillColor(29, 62, 137); // Dark Blue Header
      doc.rect(14, tableStartY, 182, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("MODEL", 42, tableStartY + 6.5, { align: 'center' });
      doc.text("IMEI NO", 92, tableStartY + 6.5, { align: 'center' });
      doc.text("CONSUMPTION", 135, tableStartY + 6.5, { align: 'center' });
      doc.text("AMOUNT", 175, tableStartY + 6.5, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      
      const complaint = extractNote(project.notes, 'Complaint') || '-';
      const model = project.custom_model_name || '-';
      const imei = project.custom_imei_number || '-';
      const amount = extractNote(project.notes, 'Profit') || project.total_billed_amount || '0';

      const rowHeight = 12;
      for (let i = 0; i < 4; i++) {
        const y = tableStartY + 10 + (i * rowHeight);
        doc.setDrawColor(0, 0, 0);
        doc.rect(14, y, 182, rowHeight);
        // Vertical lines
        doc.line(70, y, 70, y + rowHeight);
        doc.line(115, y, 115, y + rowHeight);
        doc.line(155, y, 155, y + rowHeight);
        
        if (i === 0) {
          doc.text(String(model || ''), 42, y + 7, { align: 'center' });
          doc.text(String(imei || ''), 92, y + 7, { align: 'center' });
          doc.text(String(complaint || '-'), 135, y + 7, { align: 'center' });
          doc.text(String(amount || ''), 175, y + 7, { align: 'center' });
        }
      }

      // TOTAL PAID row
      const totalY = tableStartY + 10 + (4 * rowHeight);
      doc.setFillColor(0, 0, 0);
      doc.rect(14, totalY, 141, 12, 'F');
      doc.setFillColor(29, 62, 137);
      doc.rect(155, totalY, 41, 12, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL PAID", 18, totalY + 8);
      
      doc.text(String(amount || ''), 175, totalY + 8, { align: 'center' });

      // CUSTOMER DECLARATION
      const decY = totalY + 20;
      doc.setDrawColor(29, 62, 137);
      doc.setLineWidth(0.3);
      doc.rect(14, decY, 182, 45);

      doc.setTextColor(29, 62, 137);
      doc.setFont("helvetica", "bold");
      doc.text("CUSTOMER DECLARATION", 18, decY + 8);

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);

      // Draw bullets
      doc.setFillColor(0, 0, 0);
      doc.circle(18.5, decY + 12.5, 0.7, 'F');
      doc.circle(18.5, decY + 23.5, 0.7, 'F');
      doc.circle(18.5, decY + 29.5, 0.7, 'F');
      doc.circle(18.5, decY + 37.5, 0.7, 'F');

      const decText1 = "Combo (Display, Touch, Screen) replacement, battery replacement, software installation, water damage repair, motherboard repairs,\nand other repair work may sometimes result in issues such as device becoming dead, data loss, camera malfunction, Bluetooth, Wi-Fi,\ncharging, speaker, microphone, etc. not functioning properly due to various technical reasons.";
      doc.text(decText1, 22, decY + 14);

      doc.text("I understand this and am handing over my device for repair at my own responsibility.", 22, decY + 25);
      
      const decText2 = "If, after the repair, the device develops any of the above-mentioned issues within 30 days, I understand that the service center's\nresponsibility is limited only to repairing the reported complaint.";
      doc.text(decText2, 22, decY + 31);

      doc.text("I also agree that if any other faults occur, I will not hold the service center responsible.", 22, decY + 39);

      // Checkbox
      doc.setDrawColor(29, 62, 137);
      doc.setLineWidth(0.3);
      doc.rect(21.5, decY + 41.5, 3, 3);
      
      // Draw checkmark using lines (handles lack of ✓ in default font)
      doc.line(22, decY + 43, 22.8, decY + 44);
      doc.line(22.8, decY + 44, 24.5, decY + 41.5);
      
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("I have read and understood the above terms and conditions and agree to them.", 26, decY + 44);

      // Footers (Under Customer Declaration)
      const footerY = decY + 55;
      
      doc.setFillColor(0, 0, 0);
      doc.rect(14, footerY, 182, 15, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      // Draw email envelope icon
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.rect(18, footerY + 5.5, 4, 3);
      doc.line(18, footerY + 5.5, 20, footerY + 7);
      doc.line(22, footerY + 5.5, 20, footerY + 7);

      // Add email text
      doc.text(email, 24, footerY + 8);
      
      // Right align the address
      doc.text(String(addressBottom || ''), 196 - 4, footerY + 8, { align: 'right' });

      doc.setFillColor(29, 62, 137);
      doc.rect(14, footerY + 15, 182, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("iNex - Premium Mobile & Laptop Service Center", 105, footerY + 22, { align: 'center' });

      doc.save(`INEX_Invoice_${jobCard}.pdf`);
      setOpenMenuId(null);
    };

    img.onload = () => {
      doc.addImage(img, 'PNG', 14, 10, 45, 15);
      drawContent();
    };
    img.onerror = () => {
      drawContent();
    };
  };

  const extractNote = (notes, key) => {
    if (!notes) return '';
    const plainText = notes.replace(/<[^>]*>?/gm, '\n');
    const match = plainText.match(new RegExp(`${key}:[ \\t]*(.*)`));
    return match ? match[1].trim() : '';
  };

  // Filter projects based on search term and user role and Day Book constraints
  const filteredProjects = projects.filter(p => {
    // Only include if it has actual Day Book sale data (Amount > 0 or Day Book notes)
    const hasDayBookData = p.total_billed_amount > 0 || 
                           p.total_costing_amount > 0 || 
                           extractNote(p.notes, 'Cash') !== '' || 
                           extractNote(p.notes, 'Bank') !== '' || 
                           extractNote(p.notes, 'Credit') !== '' || 
                           extractNote(p.notes, 'Consumption') !== '' ||
                           extractNote(p.notes, 'Profit') !== '' ||
                           extractNote(p.notes, 'Cost') !== '';
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
      cost: '', profit: '', branch: '', create_additional_invoice: false
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill logic when typing Code
    if (field === 'job_card' && value.trim().length > 0) {
      const match = projects.find(p => {
        const code = (p.project_name || '').trim().split(/\s+/)[0];
        return code.toLowerCase() === value.trim().toLowerCase();
      });

      if (match) {
        const nameParts = (match.project_name || '').trim().split(/\s+/);
        const name = nameParts.slice(1).join(' ') || '';
        
        setFormData(prev => ({
          ...prev,
          customer_name: name || '',
          model_name: match.custom_model_name || ''
        }));
        
        // This makes sure we update the existing job card instead of creating a duplicate!
        setEditProjectId(match.name);
      } else {
        setFormData(prev => ({
          ...prev,
          customer_name: '',
          model_name: ''
        }));
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
                  {Array.from(new Set(['INEX Thodupuzha', 'INEX Kaloor', 'INEX Perumbavoor', ...projects.map(p => p.company)])).filter(Boolean).map((branch, i) => (
                    <option key={i} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>
            )}
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
              <label>Credit</label>
              <input type="text" className="input-field" value={formData.credit} onChange={e => handleInputChange('credit', e.target.value)} />
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
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : (editProjectId ? 'Update Entry' : 'Save to Frappe')}
            </button>
            {editProjectId && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 500 }}>
                <input 
                  type="checkbox" 
                  checked={formData.create_additional_invoice || false}
                  onChange={e => handleInputChange('create_additional_invoice', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                />
                Create Additional Sales Invoice
              </label>
            )}
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
              {Array.from(new Set(['INEX Thodupuzha', 'INEX Kaloor', 'INEX Perumbavoor', ...projects.map(p => p.company)])).filter(Boolean).map((branch, i) => (
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
                    <td>{extractNote(p.notes, 'Cost') || p.total_costing_amount || '-'}</td>
                    <td style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{extractNote(p.notes, 'Profit') || p.total_billed_amount || '-'}</td>
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
                            <Download size={14} /> Download Invoice
                          </button>
                          <button 
                            onClick={() => handleDelete(p)}
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
      
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.project && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)'
        }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '90%', animation: 'fadeIn 0.2s ease-out', padding: '1.5rem' }}>
            <h3 style={{ color: '#ff6b6b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trash2 size={20} /> Confirm Deletion
            </h3>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.4' }}>
              Are you sure you want to permanently delete this entry? This action will also delete the linked Sales Invoice and cannot be undone.
            </p>
            
            {(() => {
              const p = deleteModal.project;
              const nameParts = (p.project_name || '').trim().split(/\s+/);
              const code = nameParts[0] || '';
              const name = nameParts.slice(1).join(' ') || '';
              return (
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ marginBottom: '0.5rem' }}><strong>Job Card:</strong> {code}</div>
                  <div style={{ marginBottom: '0.5rem' }}><strong>Customer:</strong> {name}</div>
                  <div><strong>Total Amount:</strong> Rs. {extractNote(p.notes, 'Profit') || p.total_billed_amount || '0'}</div>
                </div>
              )
            })()}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn" 
                style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-color)' }}
                onClick={() => setDeleteModal({ isOpen: false, project: null })}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#ff6b6b', color: 'white' }}
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayBook;

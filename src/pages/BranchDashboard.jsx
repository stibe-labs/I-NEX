import React, { useState, useEffect } from 'react';
import { PlusCircle, Users, BookOpen, ChevronRight, Package, DollarSign, Boxes, AlertCircle, Download, X, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { fetchProjects } from '../api/frappeClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BranchDashboard = () => {
  const { user } = useAuth();
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingRepairsList, setPendingRepairsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats State (Branch-specific)
  const [stats, setStats] = useState({
    totalProjects: 0,
    dayBookEntries: 0,
    pendingRepairs: 0
  });

  const extractNote = (notes, key) => {
    if (!notes) return '';
    const match = notes.match(new RegExp(`${key}:\\s*(.*)`));
    return match ? match[1].trim() : '';
  };

  useEffect(() => {
    const loadBranchStats = async () => {
      setLoading(true);
      try {
        const allProjects = await fetchProjects();
        const userBranch = user?.name || '';
        const branchKeyword = userBranch.toLowerCase().replace(/inex\s*/g, '').trim();

        // Filter projects for this specific branch
        const branchProjects = allProjects.filter(p => {
          if (!userBranch) return true;
          const pCompany = (p.company || '').trim().toLowerCase();
          const targetBranch = userBranch.trim().toLowerCase();
          return pCompany === targetBranch || (branchKeyword && pCompany.includes(branchKeyword));
        });

        let totalProjects = branchProjects.length;
        let dayBookEntries = 0;
        let pendingRepairs = 0;
        let pendingList = [];

        branchProjects.forEach(p => {
          // Calculate Day Book Entries
          const hasDayBookData = p.total_billed_amount > 0 || 
                                 p.total_costing_amount > 0 || 
                                 extractNote(p.notes, 'Cash') !== '' || 
                                 extractNote(p.notes, 'Bank') !== '' || 
                                 extractNote(p.notes, 'Credit') !== '' || 
                                 extractNote(p.notes, 'Consumption') !== '';
          if (hasDayBookData) {
            dayBookEntries++;
          }

          // Calculate Pending Repairs (strictly 'Open' status)
          if (p.status === 'Open') {
            pendingRepairs++;
            const nameParts = (p.project_name || '').trim().split(/\s+/);
            const code = nameParts[0] || '-';
            const customerName = nameParts.slice(1).join(' ') || '-';
            const phone = p.custom_phone || extractNote(p.notes, 'Phone') || '-';
            const model = p.custom_model_name || '-';
            const branch = p.company || userBranch || 'INEX';
            // Strip emojis and special chars for PDF compatibility
            const rawStatus = extractNote(p.notes, 'Status') || p.status || 'Open';
            const status = rawStatus.replace(/[^\x20-\x7E]/g, '').replace(/=\w+/g, '').trim() || 'Open';

            pendingList.push({
              code,
              name: customerName,
              phone,
              model,
              branch,
              status,
              statusRaw: rawStatus
            });
          }
        });

        setPendingRepairsList(pendingList);
        setStats({
          totalProjects,
          dayBookEntries,
          pendingRepairs
        });
      } catch (error) {
        console.error("Failed to fetch branch stats", error);
      } finally {
        setLoading(false);
      }
    };

    loadBranchStats();
  }, [user]);

  const handleDownloadPDF = (openInNewTab = false) => {
    const doc = new jsPDF();
    const branchTitle = user?.name ? user.name : 'Branch';
    const currentDate = new Date().toLocaleDateString('en-GB');

    // Title & Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("I-NEX CARE - PENDING REPAIRS REPORT", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Branch: ${branchTitle}`, 14, 28);
    doc.text(`Date: ${currentDate}`, 150, 28);
    doc.text(`Total Pending Repairs: ${pendingRepairsList.length}`, 14, 34);

    // Divider Line
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);

    // Table — strip any remaining non-ASCII chars from each cell for PDF safety
    const sanitize = (val) => String(val || '-').replace(/[^\x20-\x7E]/g, '').trim() || '-';
    const tableData = pendingRepairsList.map((item, index) => [
      index + 1,
      sanitize(item.code),
      sanitize(item.name),
      sanitize(item.phone),
      sanitize(item.model),
      sanitize(item.branch),
      sanitize(item.status)
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['#', 'Job Code', 'Customer Name', 'Phone', 'Model', 'Branch', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      }
    });

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${new Date().toLocaleString('en-GB')} | I-NEX Management System`, 105, 285, { align: 'center' });

    const safeBranch = branchTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = currentDate.replace(/\//g, '-');
    const fileName = `Pending_Repairs_${safeBranch}_${safeDate}.pdf`;

    if (openInNewTab) {
      // View PDF: open in new tab using blob URL
      const blob = doc.output('blob');
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      // Download PDF: use jsPDF's built-in save — guarantees correct .pdf filename
      doc.save(fileName);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: 0 }}>
          Branch Dashboard {user?.name ? `- ${user.name}` : ''}
        </h1>
        <Link to="/customers" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlusCircle size={18} /> New Entry
        </Link>
      </div>

      {/* Branch Stats Overview Cards (Excluding Monthly Income) */}
      <div className="dashboard-grid stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '2rem' }}>
        <Link to="/customers" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--primary-color)' }}>
            <Users size={32} />
          </div>
          <div>
            <p className="stat-card-label">Total Projects</p>
            <h2 className="stat-card-value">{loading ? '...' : stats.totalProjects}</h2>
          </div>
        </Link>
        
        <Link to="/daybook" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(0, 0, 0, 0.05)', color: 'var(--primary-color)' }}>
            <BookOpen size={32} />
          </div>
          <div>
            <p className="stat-card-label">Day Book Entries</p>
            <h2 className="stat-card-value">{loading ? '...' : stats.dayBookEntries}</h2>
          </div>
        </Link>
        
        <div onClick={() => setShowPendingModal(true)} className="glass-card stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
            <AlertCircle size={32} />
          </div>
          <div>
            <p className="stat-card-label">Pending Repairs</p>
            <h2 className="stat-card-value">{loading ? '...' : stats.pendingRepairs}</h2>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={20} color="var(--primary-color)" /> Quick Links
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <Link to="/customers" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <Users size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Add Customer Details</h4>
                <p>Create new job cards and customer records</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>

            <Link to="/daybook" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <BookOpen size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Update Day Book</h4>
                <p>Manage daily income and expenses</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>

            <Link to="/accessories" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <Package size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Accessories</h4>
                <p>Track accessory stock and sales</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>

            <Link to="/inex-accessories" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                <Boxes size={20} />
              </div>
              <div className="quick-link-text">
                <h4>INEX Accessories</h4>
                <p>Manage INEX items for your branch</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>

            <Link to="/expenses" className="quick-link-card">
              <div className="quick-link-icon" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                <DollarSign size={20} />
              </div>
              <div className="quick-link-text">
                <h4>Expense & Income</h4>
                <p>Manage payments in and out</p>
              </div>
              <ChevronRight size={20} color="var(--text-secondary)" />
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Repairs Modal with PDF Download */}
      {showPendingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>Pending Repairs {user?.name ? `- ${user.name}` : ''}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  className="btn" 
                  onClick={() => handleDownloadPDF(true)} 
                  disabled={pendingRepairsList.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                  title="View PDF directly in browser"
                >
                  <Eye size={16} /> View PDF
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleDownloadPDF(false)} 
                  disabled={pendingRepairsList.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  <Download size={16} /> Download PDF
                </button>
                <button 
                  onClick={() => setShowPendingModal(false)} 
                  className="btn-icon" 
                  style={{ background: 'transparent', padding: '0.5rem', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>CODE</th>
                  <th style={{ textAlign: 'left' }}>CUSTOMER</th>
                  <th style={{ textAlign: 'left' }}>PHONE</th>
                  <th style={{ textAlign: 'left' }}>MODEL</th>
                  <th style={{ textAlign: 'left' }}>BRANCH</th>
                  <th style={{ textAlign: 'left' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {pendingRepairsList.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.code}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.phone}</td>
                    <td>{item.model}</td>
                    <td>{item.branch}</td>
                    <td><span className="badge badge-warning">{item.status}</span></td>
                  </tr>
                ))}
                {pendingRepairsList.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No pending repairs found for this branch.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchDashboard;

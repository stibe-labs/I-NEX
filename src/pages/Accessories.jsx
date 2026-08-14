import React, { useState, useEffect } from 'react';
import { fetchAccessories, saveAccessory } from '../api/pgClient';
import { Plus, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const Accessories = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    item_code: '', particular: '', cash: '', bank: ''
  });
  const [filterBranch, setFilterBranch] = useState('All');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAccessories();
      setItems(data);
    } catch (e) {
      toast.error(e.message || 'Failed to fetch accessories from PostgreSQL');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if(!formData.particular) {
      toast.error("Particular is required");
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        item_code: formData.item_code,
        particular: formData.particular,
        cash: parseFloat(formData.cash) || 0,
        bank: parseFloat(formData.bank) || 0,
        created_by: user?.name || 'Admin'
      };
      
      await saveAccessory(payload);
      toast.success('Accessory Details Saved!');
      
      await loadData();
      setIsAdding(false);
      handleClear();
    } catch (e) {
      toast.error(e.message || "Failed to save to PostgreSQL. See console.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setFormData({
      item_code: '', particular: '', cash: '', bank: ''
    });
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Accessories</h1>
        {!isAdding && (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
            <Plus size={18} /> Add Entry
          </button>
        )}
      </div>

      {isAdding && (
        <div className="glass-card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>New Accessory Entry</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="input-group">
              <label>Item Code</label>
              <input type="text" className="input-field" value={formData.item_code} onChange={e => setFormData({...formData, item_code: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Particular</label>
              <input type="text" className="input-field" value={formData.particular} onChange={e => setFormData({...formData, particular: e.target.value})} required />
            </div>
            <div className="input-group">
              <label>Cash</label>
              <input type="number" className="input-field" value={formData.cash} onChange={e => setFormData({...formData, cash: e.target.value})} />
            </div>
            <div className="input-group">
              <label>Bank</label>
              <input type="number" className="input-field" value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn" style={{ background: 'rgba(0,0,0,0.05)' }} onClick={() => { setIsAdding(false); handleClear(); }}>
              <X size={18} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="table-container">
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          {user?.role === 'admin' && (
            <select 
              className="input-field" 
              style={{ width: 'auto', minWidth: '150px' }}
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
            >
              <option value="All">All Branches</option>
              {Array.from(new Set(['INEX Thodupuzha', 'INEX Kaloor', 'INEX Perumbavoor', ...items.map(item => item.created_by)])).filter(Boolean).map((branch, i) => (
                <option key={i} value={branch}>{branch}</option>
              ))}
            </select>
          )}
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading live data from PostgreSQL...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>ITEM CODE</th>
                <th>PARTICULAR</th>
                <th>CASH</th>
                <th>BANK</th>
                <th>CREATED BY</th>
              </tr>
            </thead>
            <tbody>
              {items
                .filter(item => user?.role === 'admin' ? (filterBranch === 'All' || item.created_by === filterBranch) : item.created_by === user?.name)
                .map((item, i) => {
                const dateObj = new Date(item.created_at);
                const dateString = isNaN(dateObj) ? '' : `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

                return (
                  <tr key={item.id || i}>
                    <td>{dateString}</td>
                    <td>{item.item_code || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{item.particular}</td>
                    <td style={{ fontWeight: 600, color: 'var(--success-color)' }}>{item.cash || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{item.bank || '-'}</td>
                    <td>{item.created_by}</td>
                  </tr>
                );
              })}
              {items.filter(item => user?.role === 'admin' ? (filterBranch === 'All' || item.created_by === filterBranch) : item.created_by === user?.name).length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Accessories;

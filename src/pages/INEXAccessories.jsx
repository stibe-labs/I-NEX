import React, { useState, useEffect, useCallback } from 'react';
import { fetchINEXItems, getNextINEXItemId, createINEXItem, getINEXBranchConfig } from '../api/frappeClient';
import { Plus, Save, X, Package, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';

const BRANCH_CONFIG = getINEXBranchConfig();
const BRANCH_NAMES = Object.keys(BRANCH_CONFIG);

const INEXAccessories = () => {
  const { user } = useAuth();
  
  // Detect the user's branch (for branch users, lock to their branch)
  const getUserBranch = () => {
    if (user?.role === 'admin') return null; // admin can see all
    // Match user name to one of the branch names
    const matched = BRANCH_NAMES.find(b => user?.name?.includes(b) || b.includes(user?.name));
    return matched || null;
  };

  const userBranch = getUserBranch();
  const [selectedBranch, setSelectedBranch] = useState(userBranch || BRANCH_NAMES[0]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nextId, setNextId] = useState('');
  
  const [formData, setFormData] = useState({
    item_name: '',
    uom: ''
  });

  const currentConfig = BRANCH_CONFIG[selectedBranch];

  const loadData = useCallback(async () => {
    if (!currentConfig) return;
    setLoading(true);
    try {
      const data = await fetchINEXItems(currentConfig.prefix);
      setItems(data);
    } catch (e) {
      toast.error(e.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [currentConfig]);

  const loadNextId = useCallback(async () => {
    if (!currentConfig) return;
    try {
      const id = await getNextINEXItemId(currentConfig.prefix);
      setNextId(id);
    } catch (e) {
      setNextId(currentConfig.prefix + '1');
    }
  }, [currentConfig]);

  useEffect(() => {
    loadData();
    loadNextId();
  }, [loadData, loadNextId]);

  const handleSave = async () => {
    if (!formData.item_name.trim()) {
      toast.error('Item Name is required');
      return;
    }

    setIsSaving(true);
    try {
      await createINEXItem({
        itemCode: nextId,
        itemName: formData.item_name.trim(),
        uom: formData.uom.trim() || 'Nos',
        warehouse: currentConfig.warehouse
      });

      toast.success(`Item ${nextId} created successfully!`);
      setIsAdding(false);
      setFormData({ item_name: '', uom: '' });
      await loadData();
      await loadNextId();
    } catch (e) {
      toast.error(e.message || 'Failed to create item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setFormData({ item_name: '', uom: '' });
  };

  const handleBranchChange = (branch) => {
    setSelectedBranch(branch);
    setIsAdding(false);
    setFormData({ item_name: '', uom: '' });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Package size={28} style={{ color: 'var(--primary-color)' }} />
          INEX Accessories
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn" style={{ background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { loadData(); loadNextId(); }}>
            <RefreshCw size={16} /> Refresh
          </button>
          {!isAdding && (
            <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
              <Plus size={18} /> Add Item
            </button>
          )}
        </div>
      </div>

      {/* Branch Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0', 
        marginBottom: '1.5rem', 
        borderRadius: '12px', 
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
        background: 'rgba(0,0,0,0.02)'
      }}>
        {BRANCH_NAMES.map((branch) => {
          const isActive = selectedBranch === branch;
          const config = BRANCH_CONFIG[branch];
          // If branch user, only show their branch
          if (userBranch && branch !== userBranch) return null;
          
          return (
            <button
              key={branch}
              onClick={() => handleBranchChange(branch)}
              style={{
                flex: 1,
                padding: '0.85rem 1.25rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                background: isActive ? 'var(--primary-color)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.25s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                position: 'relative',
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              }}>
                {config.prefix}
              </span>
              {branch.replace('INEX ', '')}
            </button>
          );
        })}
      </div>

      {/* Add Item Form */}
      {isAdding && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={20} style={{ color: 'var(--primary-color)' }} />
            New Item — {selectedBranch}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* ID - Auto-generated (read-only) */}
            <div className="input-group">
              <label>ID <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(auto)</span></label>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.08)',
                fontWeight: 700,
                fontSize: '1.1rem',
                color: 'var(--primary-color)',
                letterSpacing: '0.5px'
              }}>
                {nextId || <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              </div>
            </div>

            {/* Item Name */}
            <div className="input-group">
              <label>Item Name <span style={{ color: 'var(--danger-color)' }}>*</span></label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. NOKIA LED"
                value={formData.item_name}
                onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                autoFocus
              />
            </div>

            {/* Item Group - Read-only */}
            <div className="input-group">
              <label>Item Group <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>(fixed)</span></label>
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.08)',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>
                Products
              </div>
            </div>

            {/* Unit / NOS */}
            <div className="input-group">
              <label>Unit / NOS</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Nos, KG, Piece"
                value={formData.uom}
                onChange={e => setFormData({ ...formData, uom: e.target.value })}
              />
            </div>
          </div>

          {/* Warehouse info */}
          <div style={{
            marginTop: '1rem',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Package size={14} style={{ color: 'var(--success-color)' }} />
            Will be saved under warehouse: <strong style={{ color: 'var(--text-primary)' }}>{currentConfig?.warehouse}</strong>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {isSaving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
              {isSaving ? 'Creating...' : 'Save Item'}
            </button>
            <button className="btn" style={{ background: 'rgba(0,0,0,0.05)' }} onClick={handleCancel}>
              <X size={18} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="table-container">
        <div style={{ 
          padding: '1rem 1.25rem', 
          borderBottom: '1px solid rgba(0,0,0,0.05)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {selectedBranch} — Items ({items.length})
          </span>
          <span style={{ 
            fontSize: '0.8rem', 
            padding: '0.3rem 0.75rem', 
            borderRadius: '20px', 
            background: 'rgba(0,0,0,0.04)',
            color: 'var(--text-secondary)',
            fontWeight: 500
          }}>
            Warehouse: {currentConfig?.warehouse}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
            <br />Loading items from ERPNext...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ITEM NAME</th>
                <th>ITEM GROUP</th>
                <th>UNIT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.item_code || i}>
                  <td style={{ fontWeight: 700, color: 'var(--primary-color)', letterSpacing: '0.3px' }}>
                    {item.item_code}
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      color: 'var(--success-color)',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      {item.item_group}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{item.stock_uom || 'Nos'}</td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: item.disabled ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                      color: item.disabled ? 'var(--danger-color)' : 'var(--success-color)',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      {item.disabled ? 'Disabled' : 'Enabled'}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No items found for {selectedBranch}. Click "Add Item" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default INEXAccessories;

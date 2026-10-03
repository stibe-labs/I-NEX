import React, { useState, useEffect, useCallback } from 'react';
import { fetchINEXItems, getNextINEXItemId, createINEXItem, updateINEXItem, deleteINEXItem, toggleINEXItemStatus, getINEXBranchConfig } from '../api/frappeClient';
import { Plus, Save, X, Package, RefreshCw, Loader2, MoreVertical, Edit, Trash2, Power, Eye, EyeOff, Search } from 'lucide-react';
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
  const [editingItem, setEditingItem] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [showDisabled, setShowDisabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    const trimmed = query.trim();
    if (!trimmed) return text;
    const tokens = trimmed.split(/\s+/).filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (tokens.length === 0) return text;
    const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark 
          key={index} 
          style={{ 
            backgroundColor: 'rgba(254, 240, 138, 0.7)', 
            color: 'inherit', 
            fontWeight: 'inherit',
            padding: '1px 3px', 
            borderRadius: '3px' 
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);
  
  const [formData, setFormData] = useState({
    custom_id: '',
    item_name: '',
    quantity: '',
    purchase_price: '',
    selling_price: ''
  });

  const currentConfig = BRANCH_CONFIG[selectedBranch];

  const loadData = useCallback(async () => {
    if (!currentConfig) return;
    setLoading(true);
    try {
      const data = await fetchINEXItems(
        currentConfig.prefix,
        currentConfig.warehouse
      );
      setItems(data);
    } catch (e) {
      toast.error(e.message || 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [currentConfig]);

  const loadNextId = useCallback(async () => {
    if (!currentConfig) return;
    const prefix = currentConfig.prefix;
    try {
      const id = await getNextINEXItemId(prefix);
      setNextId(id);
      setFormData(prev => {
        if (!editingItem) {
          const isStale = prev.custom_id && !prev.custom_id.toUpperCase().startsWith(prefix.toUpperCase());
          return {
            ...prev,
            custom_id: (!prev.custom_id || isStale) ? id : prev.custom_id
          };
        }
        return prev;
      });
    } catch (e) {
      const fallback = prefix + '1';
      setNextId(fallback);
      setFormData(prev => {
        if (!editingItem) {
          const isStale = prev.custom_id && !prev.custom_id.toUpperCase().startsWith(prefix.toUpperCase());
          return {
            ...prev,
            custom_id: (!prev.custom_id || isStale) ? fallback : prev.custom_id
          };
        }
        return prev;
      });
    }
  }, [currentConfig, editingItem]);

  useEffect(() => {
    loadData();
    loadNextId();
  }, [loadData, loadNextId]);

  const handleSave = async () => {
    const targetId = editingItem ? editingItem.item_code : (formData.custom_id || nextId || '').trim();
    if (!targetId) {
      toast.error('Code / Item ID is required');
      return;
    }
    if (!formData.item_name.trim()) {
      toast.error('Item Name is required');
      return;
    }
    if (!editingItem && items.some(it => (it.item_code || '').toLowerCase() === targetId.toLowerCase())) {
      toast.error(`Code "${targetId}" already exists. Please choose a different code.`);
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateINEXItem(editingItem.item_code, {
          item_name: formData.item_name.trim(),
          custom_unit_qty: formData.quantity ? formData.quantity.toString().trim() : '',
          purchase_price: formData.purchase_price !== '' ? formData.purchase_price : 0,
          selling_price: formData.selling_price !== '' ? formData.selling_price : 0
        });
        toast.success(`Item ${editingItem.item_code} updated successfully!`);
      } else {
        await createINEXItem({
          itemCode: targetId,
          itemName: formData.item_name.trim(),
          uom: 'Nos',
          warehouse: currentConfig.warehouse,
          company: currentConfig.company,
          quantity: formData.quantity ? formData.quantity.toString().trim() : '',
          purchasePrice: formData.purchase_price !== '' ? formData.purchase_price : 0,
          sellingPrice: formData.selling_price !== '' ? formData.selling_price : 0
        });
        toast.success(`Item ${targetId} created successfully!`);
      }
      
      setIsAdding(false);
      setEditingItem(null);
      setFormData({ custom_id: '', item_name: '', quantity: '', purchase_price: '', selling_price: '' });
      await loadData();
      await loadNextId();
    } catch (e) {
      toast.error(e.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setFormData({
      custom_id: item.item_code,
      item_name: item.item_name || '',
      quantity: (item.custom_unit_qty !== undefined && item.custom_unit_qty !== null && item.custom_unit_qty !== 'Nos') ? item.custom_unit_qty : '',
      purchase_price: (item.purchase_price !== undefined && item.purchase_price !== null && Number(item.purchase_price) > 0) ? item.purchase_price : '',
      selling_price: (item.selling_price !== undefined && item.selling_price !== null && Number(item.selling_price) > 0) ? item.selling_price : ''
    }); 
    setIsAdding(true);
  };

  const handleDeleteClick = async (itemCode) => {
    if (!window.confirm(`Are you sure you want to delete ${itemCode}?`)) return;
    try {
      const res = await deleteINEXItem(itemCode);
      if (res && res.disabled) {
        toast.success(`${itemCode} has stock history, so it was disabled instead of deleted.`);
      } else {
        toast.success(`${itemCode} deleted successfully`);
      }
      loadData();
      loadNextId();
    } catch (e) {
      toast.error(e.message || 'Failed to delete item');
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const newDisabled = await toggleINEXItemStatus(item.item_code, item.disabled);
      toast.success(`${item.item_code} ${newDisabled ? 'disabled' : 'enabled'} successfully`);
      loadData();
    } catch (e) {
      toast.error(e.message || 'Failed to update item status');
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingItem(null);
    setFormData({ custom_id: '', item_name: '', quantity: '', purchase_price: '', selling_price: '' });
  };

  const handleBranchChange = (branch) => {
    setSelectedBranch(branch);
    setNextId('');
    setIsAdding(false);
    setEditingItem(null);
    setFormData({ custom_id: '', item_name: '', quantity: '', purchase_price: '', selling_price: '' });
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
          <button 
            className="btn" 
            style={{ 
              background: !showDisabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)', 
              color: !showDisabled ? 'var(--success-color)' : 'inherit',
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem',
              fontSize: '0.85rem'
            }} 
            onClick={() => setShowDisabled(!showDisabled)}
            title={showDisabled ? "Click to show active items only" : "Click to show all items"}
          >
            {!showDisabled ? <EyeOff size={16} /> : <Eye size={16} />}
            {!showDisabled ? 'Active Only' : 'Showing All'}
          </button>
          <button className="btn" style={{ background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => { loadData(); loadNextId(); }}>
            <RefreshCw size={16} /> Refresh
          </button>
          {!isAdding && (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                const prefix = currentConfig?.prefix || 'IP';
                const defaultNext = (nextId && nextId.toUpperCase().startsWith(prefix.toUpperCase())) ? nextId : `${prefix}1`;
                setFormData({ custom_id: defaultNext, item_name: '', quantity: '', purchase_price: '', selling_price: '' });
                setIsAdding(true);
              }}
            >
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

      {/* Add/Edit Item Form */}
      {isAdding && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {editingItem ? <Edit size={20} style={{ color: 'var(--primary-color)' }} /> : <Plus size={20} style={{ color: 'var(--primary-color)' }} />}
            {editingItem ? `Edit Item — ${editingItem.item_code}` : `New Item — ${selectedBranch}`}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {/* Code - Auto-generated (default), but editable */}
            <div className="input-group">
              <label>Code <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{editingItem ? '(fixed)' : '(auto, editable)'}</span></label>
              {editingItem ? (
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
                  {editingItem.item_code}
                </div>
              ) : (
                <input
                  type="text"
                  className="input-field"
                  placeholder={nextId || `${currentConfig?.prefix || 'IP'}1`}
                  value={formData.custom_id}
                  onChange={e => setFormData({ ...formData, custom_id: e.target.value })}
                  style={{
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: 'var(--primary-color)',
                    letterSpacing: '0.5px'
                  }}
                />
              )}
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

            {/* Quantity */}
            <div className="input-group">
              <label>Quantity</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 1, 2, 5"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                min="0"
              />
            </div>

            {/* Purchase Price */}
            <div className="input-group">
              <label>Purchase Price (₹)</label>
              <input
                type="number"
                step="any"
                className="input-field"
                placeholder="e.g. 150"
                value={formData.purchase_price}
                onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
                min="0"
              />
            </div>

            {/* Selling Price */}
            <div className="input-group">
              <label>Selling Price (₹)</label>
              <input
                type="number"
                step="any"
                className="input-field"
                placeholder="e.g. 250"
                value={formData.selling_price}
                onChange={e => setFormData({ ...formData, selling_price: e.target.value })}
                min="0"
              />
            </div>
          </div>

          {/* Warehouse & Group info */}
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
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={14} style={{ color: 'var(--success-color)' }} />
              <span>Warehouse: <strong style={{ color: 'var(--text-primary)' }}>{currentConfig?.warehouse}</strong></span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Item Group: <strong style={{ color: 'var(--text-primary)' }}>Products</strong>
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {isSaving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
              {isSaving ? (editingItem ? 'Saving...' : 'Creating...') : (editingItem ? 'Update Item' : 'Save Item')}
            </button>
            <button className="btn" style={{ background: 'rgba(0,0,0,0.05)' }} onClick={handleCancel}>
              <X size={18} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      {(() => {
        const totalBranchItems = items.filter(item => showDisabled || !item.disabled);
        const filteredItems = totalBranchItems.filter(item => {
          if (!searchQuery.trim()) return true;
          const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
          const code = (item.item_code || '').toLowerCase();
          const name = (item.item_name || '').toLowerCase();
          return tokens.every(token => code.includes(token) || name.includes(token));
        });

        // Ensure latest entries appear first (newest created in Frappe at the top)
        const sortedItems = [...filteredItems].sort((a, b) => {
          const timeA = a.creation ? new Date(a.creation).getTime() : 0;
          const timeB = b.creation ? new Date(b.creation).getTime() : 0;
          if (timeB !== timeA) return timeB - timeA;
          return (b.item_code || '').localeCompare(a.item_code || '');
        });

        return (
          <div className="table-container">
            <div style={{ 
              padding: '0.85rem 1.25rem', 
              borderBottom: '1px solid rgba(0,0,0,0.05)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {selectedBranch} — Items
                </span>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '12px',
                  background: searchQuery.trim() ? 'rgba(37, 99, 235, 0.1)' : 'rgba(0,0,0,0.06)',
                  color: searchQuery.trim() ? '#2563eb' : 'var(--text-secondary)',
                }}>
                  {searchQuery.trim() ? `${filteredItems.length} of ${totalBranchItems.length}` : `${totalBranchItems.length}`}
                </span>
                {searchQuery.trim() && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    found for "{searchQuery.trim()}"
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  maxWidth: '340px',
                  minWidth: '220px'
                }}>
                  <Search 
                    size={16} 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--text-secondary)',
                      pointerEvents: 'none'
                    }} 
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setSearchQuery(''); }}
                    placeholder={`Search ${selectedBranch.replace('INEX ', '')} by item name or ID...`}
                    style={{
                      width: '100%',
                      padding: '0.55rem 2.25rem 0.55rem 2.25rem',
                      fontSize: '0.85rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: '#ffffff',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary-color)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0,0,0,0.12)';
                      e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      title="Clear search (Esc)"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.06)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        padding: 0
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.12)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <span style={{ 
                  fontSize: '0.8rem', 
                  padding: '0.35rem 0.75rem', 
                  borderRadius: '20px', 
                  background: 'rgba(0,0,0,0.04)',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}>
                  Warehouse: {currentConfig?.warehouse}
                </span>
              </div>
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
                    <th>CODE</th>
                    <th>ITEM NAME</th>
                    <th>QUANTITY</th>
                    <th>PURCHASE PRICE</th>
                    <th>SELLING PRICE</th>
                    <th>STATUS</th>
                    <th style={{ width: '60px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item, i) => {
                    const hasPurchase = item.purchase_price !== undefined && item.purchase_price !== null && Number(item.purchase_price) > 0;
                    const hasSelling = item.selling_price !== undefined && item.selling_price !== null && Number(item.selling_price) > 0;
                    const hasQty = item.custom_unit_qty !== undefined && item.custom_unit_qty !== null && item.custom_unit_qty !== '';

                    return (
                      <tr key={item.item_code || i} style={{ opacity: item.disabled ? 0.65 : 1 }}>
                        <td style={{ fontWeight: 700, color: item.disabled ? 'var(--text-secondary)' : 'var(--primary-color)', letterSpacing: '0.3px' }}>
                          {highlightMatch(item.item_code, searchQuery)}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {highlightMatch(item.item_name, searchQuery)}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {hasQty ? (
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.custom_unit_qty}</span>
                          ) : (
                            <span style={{ opacity: 0.5 }}>—</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: hasPurchase ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {hasPurchase ? (
                            `₹${Number(item.purchase_price).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(Number(item.purchase_price)) ? 0 : 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span style={{ opacity: 0.5 }}>—</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: hasSelling ? 'var(--success-color, #10b981)' : 'var(--text-secondary)' }}>
                          {hasSelling ? (
                            `₹${Number(item.selling_price).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(Number(item.selling_price)) ? 0 : 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span style={{ opacity: 0.5 }}>—</span>
                          )}
                        </td>
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
                        <td style={{ position: 'relative', textAlign: 'center' }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(dropdownOpen === item.item_code ? null : item.item_code);
                            }}
                            style={{ 
                              border: 'none', background: 'transparent', cursor: 'pointer',
                              color: 'var(--text-secondary)', padding: '0.5rem', borderRadius: '50%' 
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {dropdownOpen === item.item_code && (
                            <div style={{
                              position: 'absolute',
                              right: '80%',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: '#fff',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                              border: '1px solid rgba(0,0,0,0.06)',
                              borderRadius: '8px',
                              padding: '0.4rem',
                              zIndex: 100,
                              display: 'flex',
                              flexDirection: 'column',
                              minWidth: '130px'
                            }}>
                              <button 
                                onClick={() => handleEditClick(item)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Edit size={14} style={{ color: 'var(--primary-color)' }} /> Edit
                              </button>
                              <button 
                                onClick={() => handleToggleStatus(item)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 500, color: item.disabled ? 'var(--success-color)' : '#d97706' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Power size={14} /> {item.disabled ? 'Enable Item' : 'Disable Item'}
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(item.item_code)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--danger-color)' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {sortedItems.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
                        {searchQuery.trim() ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              background: 'rgba(0,0,0,0.04)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-secondary)'
                            }}>
                              <Search size={22} />
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              No items matching "{searchQuery.trim()}" in {selectedBranch}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.4 }}>
                              No item name or item ID matches your search in this branch. Check for typos or clear the search.
                            </div>
                            <button 
                              type="button"
                              className="btn" 
                              style={{ 
                                marginTop: '0.5rem', 
                                padding: '0.45rem 1rem', 
                                fontSize: '0.85rem',
                                background: 'var(--primary-color)',
                                color: '#fff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }} 
                              onClick={() => setSearchQuery('')}
                            >
                              <X size={14} /> Clear Search
                            </button>
                          </div>
                        ) : (
                          `No ${!showDisabled ? 'active ' : ''}items found for ${selectedBranch}.`
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default INEXAccessories;

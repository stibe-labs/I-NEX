import React, { useState, useEffect } from 'react';
import { UserPlus, Wrench, Building, Eye, EyeOff, Users, Shield, Edit2, X } from 'lucide-react';
import { addEmployee, addBranchUser, fetchEmployees, fetchUsers, updateBranchUser } from '../api/frappeClient';

const TeamManagement = () => {
  // Staff State
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  
  // Technician State
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');

  // Branch State
  const [branchName, setBranchName] = useState('');
  const [branchUsername, setBranchUsername] = useState('');
  const [branchPassword, setBranchPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Lists State
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit User State
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, usrs] = await Promise.all([
        fetchEmployees(),
        fetchUsers()
      ]);
      setEmployees(emps);
      // Filter out standard frappe system users and the admin user from the Branch Users list
      setUsers(usrs.filter(u => 
        u.name !== 'Administrator' && 
        u.name !== 'Guest' && 
        u.username !== 'admin' && 
        u.email !== 'inextadmin@gmail.com' &&
        u.first_name !== 'Admin'
      ));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if(!staffName || !staffPhone) return;
    try {
      await addEmployee(staffName, staffPhone);
      alert('Staff created successfully!');
      setStaffName('');
      setStaffPhone('');
      loadData();
    } catch(err) {
      alert('Failed to create staff. Check console for details.');
    }
  };

  const handleAddTech = async (e) => {
    e.preventDefault();
    if(!techName || !techPhone) return;
    try {
      await addEmployee(techName, techPhone);
      alert('Technician created successfully!');
      setTechName('');
      setTechPhone('');
      loadData();
    } catch(err) {
      alert('Failed to create technician. Check console for details.');
    }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if(!branchName || !branchUsername || !branchPassword) return;
    try {
      await addBranchUser(branchName, branchUsername, branchPassword);
      alert('Branch User created successfully!');
      setBranchName('');
      setBranchUsername('');
      setBranchPassword('');
      loadData();
    } catch(err) {
      alert('Failed to create branch user. Check console for details.');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditUsername(user.username || user.email || user.name);
    setEditPassword('');
    setShowEditPassword(false);
  };

  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    if(!editingUser) return;
    try {
      await updateBranchUser(editingUser.name, editUsername, editPassword);
      alert('Branch User updated successfully!');
      setEditingUser(null);
      loadData();
    } catch (err) {
      alert('Failed to update branch user. Keep in mind Frappe restricts changing the primary email ID directly via API for security reasons. Check console for details.');
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem' }}>Team Management</h1>
      
      {/* Edit Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Edit2 size={20} /> Edit Branch User
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Updating details for <strong>{editingUser.first_name}</strong>
            </p>
            
            <form onSubmit={handleUpdateBranch}>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <label>Username</label>
                <input type="text" className="input-field" value={editUsername} onChange={e => setEditUsername(e.target.value)} required />
              </div>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label>New Password (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showEditPassword ? "text" : "password"} 
                    className="input-field" 
                    value={editPassword} 
                    onChange={e => setEditPassword(e.target.value)} 
                    placeholder="Leave blank to keep current password"
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{ 
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn" onClick={() => setEditingUser(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.05)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        
        {/* Add Staff */}
        <div className="glass-card">
          <form onSubmit={handleAddStaff}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} /> Add Staff
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Creates a record for a staff member. No login access.
            </p>
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label>Full Name</label>
              <input type="text" className="input-field" value={staffName} onChange={e => setStaffName(e.target.value)} required />
            </div>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label>Phone Number</label>
              <input type="text" className="input-field" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Staff</button>
          </form>
        </div>

        {/* Add Technician */}
        <div className="glass-card">
          <form onSubmit={handleAddTech}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={20} /> Add Technician
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Creates a record for a technician. No login access.
            </p>
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label>Technician Name</label>
              <input type="text" className="input-field" value={techName} onChange={e => setTechName(e.target.value)} required />
            </div>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label>Phone Number</label>
              <input type="text" className="input-field" value={techPhone} onChange={e => setTechPhone(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Technician</button>
          </form>
        </div>

        {/* Add Branch */}
        <div className="glass-card">
          <form onSubmit={handleAddBranch}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={20} /> Add Branch User
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Creates a branch account with login access to the Branch Dashboard.
            </p>
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label>Branch Name</label>
              <input type="text" className="input-field" value={branchName} onChange={e => setBranchName(e.target.value)} required />
            </div>
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label>Username</label>
              <input type="text" className="input-field" value={branchUsername} onChange={e => setBranchUsername(e.target.value)} required />
            </div>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="input-field" 
                  value={branchPassword} 
                  onChange={e => setBranchPassword(e.target.value)} 
                  required 
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Branch User</button>
          </form>
        </div>

      </div>

      <div className="dashboard-grid" style={{ marginTop: '3rem' }}>
        
        {/* Employees List */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} /> Staff & Technicians
          </h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length > 0 ? employees.map((emp, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{emp.employee_name}</td>
                      <td>{emp.cell_number || emp.custom_phone || '-'}</td>
                      <td>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          background: emp.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: emp.status === 'Active' ? 'var(--success-color)' : 'var(--danger-color)'
                        }}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '1rem' }}>No staff found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Branch Users List */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} /> Branch Users
          </h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Branch / Name</th>
                    <th>Username</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? users.map((u, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{u.first_name} {u.name === 'Administrator' ? '(Admin)' : ''}</td>
                      <td>{u.username || u.email || u.name}</td>
                      <td>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          background: u.enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: u.enabled ? 'var(--success-color)' : 'var(--danger-color)'
                        }}>
                          {u.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => openEditModal(u)}
                          style={{ 
                            background: 'none', border: 'none', cursor: 'pointer', 
                            color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.25rem' 
                          }}
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No branch users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TeamManagement;

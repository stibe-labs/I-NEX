import React, { useState } from 'react';
import { useAuth } from '../App';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { verifyLogin } from '../api/frappeClient';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const isAdminUsername = username === 'inextadmin@gmail.com' || username === 'inextadmin' || username === 'INEXadmin';
      const role = isAdminUsername ? 'admin' : 'branch';

      // Enforce hardcoded passwords for the admin accounts
      if (isAdminUsername) {
        const isValid = 
          ((username === 'inextadmin@gmail.com' || username === 'inextadmin') && password === 'inextadmin@123') ||
          (username === 'INEXadmin' && password === 'INEXadmin@123');
          
        if (!isValid) {
          setError('Invalid admin credentials.');
          setLoading(false);
          return;
        }
      }

      // In a real app we'd authenticate branch users against Frappe here.
      if (!isAdminUsername) {
        const authRes = await verifyLogin(username, password);
        if(authRes.success) { 
          login(role, authRes.user || username);
          navigate('/');
        } else {
          setError('Invalid branch credentials.');
          setLoading(false);
          return;
        }
      } else {
        // Admin credentials already verified above
        login(role, 'Admin');
        navigate('/');
      }
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', position: 'relative' }}>
      <img src="/hna.webp" alt="HNA Logo" style={{ position: 'fixed', top: '20px', left: '20px', height: '120px', objectFit: 'contain', zIndex: 1000 }} />
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/INEX%20final%20logo-04.png" alt="INEX Logo" style={{ height: '64px', marginBottom: '0.5rem', objectFit: 'contain' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Sign in to your account</p>
        </div>

        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingLeft: '2.5rem' }} 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="input-group" style={{ marginBottom: '1.5rem' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type={showPassword ? "text" : "password"} 
                className="input-field" 
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

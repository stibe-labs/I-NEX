// src/api/frappeClient.js
const API_URL = ''; // Relative path, Vite will proxy /api to the Frappe backend
// Using the provided API Key and Secret
const API_KEY = 'd7eebdb398d3ea3';
const API_SECRET = '3d82cdb07e0006e';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
});

const extractFrappeError = async (res, defaultMsg) => {
  try {
    const err = await res.json();
    let errorMsg = defaultMsg;
    if (err._server_messages) {
      try {
        const msgs = JSON.parse(err._server_messages);
        const parsedMsgs = msgs.map(msg => {
          const parsed = JSON.parse(msg);
          return parsed.message ? parsed.message.replace(/<[^>]*>?/gm, '') : msg;
        });
        errorMsg = parsedMsgs.join(', ');
      } catch (e) {
        errorMsg = err._server_messages;
      }
    } else if (err.exc_type) {
      errorMsg = err.exc_type;
    } else if (err.exception) {
      errorMsg = err.exception;
    } else if (err.message) {
      errorMsg = err.message;
    }
    return new Error(errorMsg);
  } catch (e) {
    return new Error(defaultMsg);
  }
};

export const fetchProjects = async () => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Project?fields=["*"]&limit=1000`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching Projects", error);
    return [];
  }
};

export const fetchEmployees = async () => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Employee?fields=["name","employee_name","cell_number","status"]&limit=1000`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching Employees", error);
    return [];
  }
};

export const fetchUsers = async () => {
  try {
    // Only fetching Branch Users - maybe filter by a role if possible, or just fetch all and filter in frontend
    const res = await fetch(`${API_URL}/api/resource/User?fields=["name","email","first_name","username","enabled"]&limit=1000`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching Users", error);
    return [];
  }
};

export const createProject = async (projectData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Project`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(projectData),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to create project');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error creating Project", error);
    throw error;
  }
};

export const updateProject = async (projectId, projectData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Project/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(projectData),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to update project');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error updating Project", error);
    throw error;
  }
};

export const deleteProject = async (projectId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Project/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to delete project');
    }
    return true;
  } catch (error) {
    console.error("Error deleting Project", error);
    throw error;
  }
};

export const addEmployee = async (employeeName, phoneNo) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Employee`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({
        first_name: employeeName,
        status: 'Active',
        gender: 'Male', // defaults since it's usually required
        date_of_birth: '2000-01-01', // Dummy DOB to satisfy ERPNext Mandatory Field
        date_of_joining: new Date().toISOString().split('T')[0],
        cell_number: phoneNo,
        // Frappe might require 'custom_phone' instead depending on setup, but cell_number is standard
      }),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to create employee');
    }
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error creating Employee", error);
    throw error;
  }
};

export const deleteEmployee = async (employeeId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Employee/${employeeId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to delete employee');
    }
    return true;
  } catch (error) {
    console.error("Error deleting Employee", error);
    throw error;
  }
};

export const addBranchUser = async (branchName, username, password) => {
  try {
    // 1. Create User
    const emailToUse = username.includes('@') ? username : `${username.replace(/\s+/g, '').toLowerCase()}@inex.local`;
    
    const res = await fetch(`${API_URL}/api/resource/User`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({
        email: emailToUse,
        username: username, // Frappe supports login by username if enabled in settings
        first_name: branchName,
        send_welcome_email: 0,
        new_password: password
      }),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to create branch user');
    }
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error creating Branch User", error);
    throw error;
  }
};

export const updateBranchUser = async (userId, username, password) => {
  try {
    const payload = {};
    if (username) {
      payload.username = username;
      payload.email = username.includes('@') ? username : `${username.replace(/\s+/g, '').toLowerCase()}@inex.local`;
    }
    if (password) {
      payload.new_password = password;
    }

    const res = await fetch(`${API_URL}/api/resource/User/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to update branch user');
    }
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error updating Branch User", error);
    throw error;
  }
};

export const verifyLogin = async (username, password) => {
  try {
    let res = await fetch(`${API_URL}/api/method/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ usr: username, pwd: password })
    });
    
    if (!res.ok && !username.includes('@')) {
       // Try with the generated dummy email we used during creation
       const dummyEmail = `${username.replace(/\s+/g, '').toLowerCase()}@inex.local`;
       res = await fetch(`${API_URL}/api/method/login`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'omit',
         body: JSON.stringify({ usr: dummyEmail, pwd: password })
       });
    }

    if(res.ok) {
        const data = await res.json();
        if (data.message === 'Logged In' || data.message === 'No App') {
            return { success: true, user: data.full_name };
        }
    }
    return { success: false };
  } catch(e) {
    console.error("Login verification failed", e);
    return { success: false, error: e };
  }
};


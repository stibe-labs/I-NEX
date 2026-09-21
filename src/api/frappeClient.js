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
    const res = await fetch(`${API_URL}/api/resource/Project?fields=["*"]&limit_page_length=0&order_by=creation desc`, {
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
    const res = await fetch(`${API_URL}/api/resource/Employee?fields=["name","employee_name","cell_number","status"]&limit_page_length=0`, {
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
    const res = await fetch(`${API_URL}/api/resource/User?fields=["name","email","first_name","username","enabled"]&limit_page_length=0`, {
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

export const ensureCustomer = async (customerName) => {
  try {
    // 1. Try to fetch existing customer
    const fetchRes = await fetch(`${API_URL}/api/resource/Customer?filters=[["customer_name","=","${encodeURIComponent(customerName)}"]]&limit=1`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await fetchRes.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].name;
    }

    // 2. If not found, create a generic one
    const createRes = await fetch(`${API_URL}/api/resource/Customer`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({
        customer_name: customerName,
        customer_type: 'Company',
      })
    });
    const createData = await createRes.json();
    if (createData.data && createData.data.name) {
      return createData.data.name;
    }
  } catch (error) {
    console.error("Error ensuring Customer:", error);
  }
  // Fallback if all else fails, attempt to use the name directly
  return customerName;
};

export const ensureItem = async (jobCardCode, itemDescription = '') => {
  try {
    const desc = itemDescription ? itemDescription.trim() : 'Service';
    const itemCode = jobCardCode ? `${jobCardCode} ${desc}`.substring(0, 140) : `GENERIC ${desc}`.substring(0, 140);
    
    // Check if itemCode already exists
    const checkRes = await fetch(`${API_URL}/api/resource/Item/${encodeURIComponent(itemCode)}`, {
      headers: getHeaders()
    });
    if (checkRes.ok) {
      return itemCode;
    }

    // Attempt to create
    const res = await fetch(`${API_URL}/api/resource/Item`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({
        item_code: itemCode,
        item_name: itemCode,
        item_group: 'Products', // Default ERPNext group
        is_stock_item: 0
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.data?.name || data.data?.item_code || itemCode;
    }
    return 'Service';
  } catch (error) {
    console.error("Error ensuring Item:", error);
    return 'Service';
  }
};

export const ensureExactItem = async (itemName) => {
  try {
    const itemCode = itemName ? itemName.trim().substring(0, 140) : 'Service';
    
    // Check if itemCode already exists
    const checkRes = await fetch(`${API_URL}/api/resource/Item/${encodeURIComponent(itemCode)}`, {
      headers: getHeaders()
    });
    if (checkRes.ok) {
      return itemCode;
    }

    const res = await fetch(`${API_URL}/api/resource/Item`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({
        item_code: itemCode,
        item_name: itemCode,
        item_group: 'Products',
        is_stock_item: 0
      })
    });
    if (res.ok) {
      const data = await res.json();
      const createdName = data.data?.name || data.data?.item_code;

      // If Frappe assigned a naming series like STO-ITEM-..., rename it to itemCode so Frappe shows Model+IMEI
      if (createdName && createdName !== itemCode && createdName.startsWith('STO-ITEM-')) {
        try {
          const renameRes = await fetch(`${API_URL}/api/method/frappe.client.rename_doc`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'omit',
            body: JSON.stringify({
              doctype: 'Item',
              old_name: createdName,
              new_name: itemCode
            })
          });
          if (renameRes.ok) {
            return itemCode;
          }
        } catch (renameErr) {
          console.warn("Failed to rename item:", renameErr);
        }
      }
      return createdName || itemCode;
    }
    return 'Service';
  } catch (error) {
    console.error("Error ensuring exact Item:", error);
    return 'Service';
  }
};

const ensurePostingDateTime = (data) => {
  if (!data) return data;
  const payload = { ...data };
  if (payload.posting_date) {
    payload.set_posting_time = 1;
    if (!payload.posting_time) {
      payload.posting_time = '12:00:00';
    }
    if (!payload.due_date) {
      payload.due_date = payload.posting_date;
    }
  }
  return payload;
};

export const createSalesInvoice = async (invoiceData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(ensurePostingDateTime(invoiceData)),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to create Sales Invoice');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error creating Sales Invoice", error);
    throw error;
  }
};

export const updateSalesInvoice = async (invoiceId, invoiceData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(ensurePostingDateTime(invoiceData)),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to update Sales Invoice');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error updating Sales Invoice", error);
    throw error;
  }
};

export const checkSalesInvoiceExists = async (projectId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice?filters=[["project","=","${encodeURIComponent(projectId)}"]]&limit=1`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.data && data.data.length > 0;
  } catch (e) {
    console.error("Failed to check if invoice exists", e);
    return false;
  }
};

export const getLinkedSalesInvoices = async (projectId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice?filters=[["project","=","${encodeURIComponent(projectId)}"]]&fields=["name","docstatus"]&limit_page_length=0`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error("Failed to fetch linked sales invoices", e);
    return [];
  }
};

export const cancelSalesInvoice = async (invoiceId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({ docstatus: 2 }),
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to cancel Sales Invoice');
    }
    return true;
  } catch (error) {
    console.error("Error canceling Sales Invoice", error);
    throw error;
  }
};

export const deleteSalesInvoice = async (invoiceId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to delete Sales Invoice');
    }
    return true;
  } catch (error) {
    console.error("Error deleting Sales Invoice", error);
    throw error;
  }
};

export const ensureSupplier = async (supplierName) => {
  try {
    // 1. Try to fetch existing supplier
    const fetchRes = await fetch(`${API_URL}/api/resource/Supplier?filters=[["supplier_name","=","${encodeURIComponent(supplierName)}"]]&limit=1`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await fetchRes.json();
    if (data.data && data.data.length > 0) {
      return data.data[0].name;
    }

    // 2. If not found, create a generic one
    const createRes = await fetch(`${API_URL}/api/resource/Supplier`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({
        supplier_name: supplierName,
        supplier_group: 'Local', // Standard default group in ERPNext
        supplier_type: 'Company',
      })
    });
    const createData = await createRes.json();
    if (createData.data && createData.data.name) {
      return createData.data.name;
    }
  } catch (error) {
    console.error("Error ensuring Supplier:", error);
  }
  // Fallback if all else fails
  return supplierName;
};

export const createPurchaseReceipt = async (receiptData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Receipt`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(ensurePostingDateTime(receiptData)),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to create Purchase Receipt');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error creating Purchase Receipt", error);
    throw error;
  }
};

export const checkPurchaseReceiptExists = async (projectId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Receipt?filters=[["project","=","${encodeURIComponent(projectId)}"]]&limit=1`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.data && data.data.length > 0;
  } catch (e) {
    console.error("Failed to check if purchase receipt exists", e);
    return false;
  }
};

export const updatePurchaseReceipt = async (receiptId, receiptData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Receipt/${encodeURIComponent(receiptId)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(ensurePostingDateTime(receiptData)),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to update Purchase Receipt');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error updating Purchase Receipt", error);
    throw error;
  }
};

export const cancelPurchaseReceipt = async (receiptId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Receipt/${encodeURIComponent(receiptId)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({ docstatus: 2 }),
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to cancel Purchase Receipt');
    }
    return true;
  } catch (error) {
    console.error("Error canceling Purchase Receipt", error);
    throw error;
  }
};

export const deletePurchaseReceipt = async (receiptId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Receipt/${encodeURIComponent(receiptId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to delete purchase receipt');
    }
    return true;
  } catch (error) {
    console.error("Error deleting Purchase Receipt", error);
    throw error;
  }
};

export const createPurchaseInvoice = async (invoiceData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Invoice`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(ensurePostingDateTime(invoiceData)),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to create Purchase Invoice');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error creating Purchase Invoice", error);
    throw error;
  }
};

export const updatePurchaseInvoice = async (invoiceId, invoiceData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Invoice/${encodeURIComponent(invoiceId)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(ensurePostingDateTime(invoiceData)),
    });
    
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to update Purchase Invoice');
    }
    
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error updating Purchase Invoice", error);
    throw error;
  }
};

export const cancelPurchaseInvoice = async (invoiceId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Invoice/${encodeURIComponent(invoiceId)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify({ docstatus: 2 }),
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to cancel Purchase Invoice');
    }
    return true;
  } catch (error) {
    console.error("Error canceling Purchase Invoice", error);
    throw error;
  }
};

export const deletePurchaseInvoice = async (invoiceId) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Invoice/${encodeURIComponent(invoiceId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to delete Purchase Invoice');
    }
    return true;
  } catch (error) {
    console.error("Error deleting Purchase Invoice", error);
    throw error;
  }
};

export const fetchPurchaseInvoices = async () => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Invoice?fields=["name","project","supplier","posting_date","grand_total","remarks","company","docstatus"]&limit_page_length=0&order_by=creation desc`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching Purchase Invoices", error);
    return [];
  }
};

export const parsePhoneDetails = (remarks, itemText = '') => {
  let model = '';
  let imei = '';

  if (remarks && remarks !== 'No Remarks') {
    const imeiMatch = remarks.match(/IMEI(?:\s*Number)?:\s*([^\n\r,]+)/i);
    if (imeiMatch) imei = imeiMatch[1].trim();

    const modelMatch = remarks.match(/Model:\s*([^\n\r,]+)/i);
    if (modelMatch) model = modelMatch[1].trim();
  }

  if (itemText) {
    if (!imei) {
      const imeiMatch = itemText.match(/IMEI(?:\s*Number)?:\s*([^\n\r,]+)/i);
      if (imeiMatch) imei = imeiMatch[1].trim();
    }
    if (!model) {
      const modelMatch = itemText.match(/Model:\s*([^,\n\r]+)/i);
      if (modelMatch) {
        model = modelMatch[1].trim();
      } else if (imei) {
        const beforeImei = itemText.split(/IMEI/i)[0].trim();
        if (beforeImei) model = beforeImei.replace(/,\s*$/, '').trim();
      } else {
        model = itemText;
      }
    }
  }

  const cleanImei = (imei && !['nill', 'null', 'n/a', 'na', '-'].includes(imei.toLowerCase().trim())) ? imei.trim() : '-';
  const cleanModel = (model && !['nill', 'null', 'n/a', 'na', '-'].includes(model.toLowerCase().trim())) ? model.trim() : '-';

  return {
    model: cleanModel,
    imei: cleanImei
  };
};

export const fetchPhonePurchases = async () => {
  const phoneProjectNames = ['PROJ-0792', 'PROJ-0793', 'PROJ-0794'];
  try {
    const [piRes, prRes] = await Promise.all([
      fetch(`${API_URL}/api/resource/Purchase Invoice?fields=["name","project","supplier","posting_date","grand_total","remarks","company","docstatus"]&limit_page_length=0&order_by=creation desc`, {
        headers: getHeaders(),
        credentials: 'omit',
      }),
      fetch(`${API_URL}/api/resource/Purchase Receipt?fields=["name","project","supplier","posting_date","grand_total","remarks","company","docstatus"]&limit_page_length=0&order_by=creation desc`, {
        headers: getHeaders(),
        credentials: 'omit',
      })
    ]);

    const piData = (await piRes.json()).data || [];
    const prData = (await prRes.json()).data || [];

    const phonePIs = piData.filter(pi => 
      !pi.remarks?.includes('Automatically generated from Day Book Entry') &&
      (phoneProjectNames.includes(pi.project) || (pi.remarks && /IMEI/i.test(pi.remarks)))
    );

    const phonePRs = prData.filter(pr => 
      !pr.remarks?.includes('Automatically generated from Day Book Entry') &&
      (phoneProjectNames.includes(pr.project) || (pr.remarks && /IMEI/i.test(pr.remarks)))
    );

    const enrichedPIs = await Promise.all(phonePIs.map(async (pi) => {
      let itemText = '';
      let linkedPr = null;

      if (!pi.remarks || pi.remarks === 'No Remarks' || !/Model:/i.test(pi.remarks) || !/IMEI/i.test(pi.remarks)) {
        try {
          const r = await fetch(`${API_URL}/api/resource/Purchase Invoice/${encodeURIComponent(pi.name)}`, {
            headers: getHeaders(),
            credentials: 'omit',
          });
          if (r.ok) {
            const d = await r.json();
            if (d.data?.items?.[0]) {
              const item = d.data.items[0];
              itemText = item.description || item.item_name || item.item_code || '';
              linkedPr = item.purchase_receipt || null;
            }
          }
        } catch (e) {
          console.warn("Error fetching PI details for " + pi.name, e);
        }
      }

      const { model, imei } = parsePhoneDetails(pi.remarks, itemText);
      return {
        ...pi,
        record_type: 'Purchase Invoice',
        model,
        imei,
        linked_pr: linkedPr,
        item_text: itemText
      };
    }));

    const linkedPrNames = new Set(enrichedPIs.map(pi => pi.linked_pr).filter(Boolean));

    const standalonePRs = await Promise.all(
      phonePRs.filter(pr => !linkedPrNames.has(pr.name)).map(async (pr) => {
        let itemText = '';
        if (!pr.remarks || !/Model:/i.test(pr.remarks) || !/IMEI/i.test(pr.remarks)) {
          try {
            const r = await fetch(`${API_URL}/api/resource/Purchase Receipt/${encodeURIComponent(pr.name)}`, {
              headers: getHeaders(),
              credentials: 'omit',
            });
            if (r.ok) {
              const d = await r.json();
              if (d.data?.items?.[0]) {
                const item = d.data.items[0];
                itemText = item.description || item.item_name || item.item_code || '';
              }
            }
          } catch (e) {
            console.warn("Error fetching PR details for " + pr.name, e);
          }
        }
        const { model, imei } = parsePhoneDetails(pr.remarks, itemText);
        return {
          ...pr,
          record_type: 'Purchase Receipt',
          model,
          imei,
          item_text: itemText
        };
      })
    );

    return [...enrichedPIs, ...standalonePRs];
  } catch (error) {
    console.error("Error fetching phone purchases", error);
    return [];
  }
};

export const fetchPurchaseReceipts = async () => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Purchase Receipt?fields=["name","project","supplier","posting_date","grand_total","remarks","company"]&limit_page_length=0&order_by=creation desc`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await res.json();
    
    // For each receipt, fetch the items to get item description, qty, rate
    const receipts = data.data || [];
    
    // To avoid too many API calls, we might fetch Purchase Receipt Item table
    // But Frappe allows fetching child tables if we request the specific document or use a report.
    // For simplicity, we can parse remarks if we saved details there, or we fetch items individually.
    // Let's just return receipts and fetch details if needed, or we can just fetch all Purchase Receipt Items.
    // Actually, saving all these details in `remarks` makes it easy to extract without N+1 queries.
    return receipts;
  } catch (error) {
    console.error("Error fetching Purchase Receipts", error);
    return [];
  }
};

export const fetchSalesInvoices = async () => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice?fields=["name","project","customer","posting_date","grand_total","remarks","company","docstatus"]&limit_page_length=0&order_by=creation desc`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching Sales Invoices", error);
    return [];
  }
};

export const fetchPhoneSales = async () => {
  const phoneProjectNames = ['PROJ-0792', 'PROJ-0793', 'PROJ-0794'];
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice?fields=["name","project","customer","posting_date","grand_total","remarks","company","docstatus"]&limit_page_length=0&order_by=creation desc`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    const data = await res.json();
    const invoices = data.data || [];

    const phoneSIs = invoices.filter(si => 
      !si.remarks?.includes('Automatically generated from Day Book Entry') &&
      (phoneProjectNames.includes(si.project) || (si.remarks && /IMEI/i.test(si.remarks)))
    );

    const enriched = await Promise.all(phoneSIs.map(async (si) => {
      let itemText = '';
      if (!si.remarks || si.remarks === 'No Remarks' || !/Model:/i.test(si.remarks) || !/IMEI/i.test(si.remarks)) {
        try {
          const r = await fetch(`${API_URL}/api/resource/Sales Invoice/${encodeURIComponent(si.name)}`, {
            headers: getHeaders(),
            credentials: 'omit',
          });
          if (r.ok) {
            const d = await r.json();
            if (d.data?.items?.[0]) {
              const item = d.data.items[0];
              itemText = item.description || item.item_name || item.item_code || '';
            }
          }
        } catch (e) {
          console.warn('Error fetching SI details for ' + si.name, e);
        }
      }
      const { model, imei } = parsePhoneDetails(si.remarks, itemText);
      return { ...si, item_text: itemText, model, imei };
    }));

    return enriched;
  } catch (error) {
    console.error("Error fetching phone sales", error);
    return [];
  }
};

// Fetch full Sales Invoice details including items (for consumption)
export const fetchSalesInvoiceDetails = async (invoiceName) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Sales Invoice/${encodeURIComponent(invoiceName)}`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (error) {
    console.error("Error fetching Sales Invoice details", error);
    return null;
  }
};

// Fetch Payment Entries linked to a Sales Invoice
export const fetchPaymentEntriesForInvoice = async (invoiceName) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Payment Entry?filters=[["Payment Entry Reference","reference_name","=","${encodeURIComponent(invoiceName)}"]]&fields=["name","mode_of_payment","paid_amount","posting_date"]&limit_page_length=0`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching Payment Entries", error);
    return [];
  }
};

// Batch-enrich projects with Sales Invoice + Payment Entry data for Day Book
export const enrichProjectsWithFrappeData = async (projects) => {
  // Step 1: Fetch ALL Sales Invoices and Payment Entries in bulk (extremely fast)
  const [allSalesInvoices, allPayments] = await Promise.all([
    fetchSalesInvoices(),
    fetch(`${API_URL}/api/resource/Payment Entry?fields=["name","mode_of_payment","paid_amount","project"]&limit_page_length=0`, { headers: getHeaders() }).then(r => r.json()).then(d => d.data || []).catch(() => [])
  ]);
  
  // Group invoices by project
  const invoicesByProject = {};
  for (const si of allSalesInvoices) {
    if (si.project) {
      if (!invoicesByProject[si.project]) invoicesByProject[si.project] = [];
      invoicesByProject[si.project].push(si);
    }
  }

  // Group payments by project
  const paymentsByProject = {};
  for (const pe of allPayments) {
    if (pe.project) {
      if (!paymentsByProject[pe.project]) paymentsByProject[pe.project] = [];
      paymentsByProject[pe.project].push(pe);
    }
  }

  // Step 2: Build enriched data locally in JS without extra API calls
  const enrichedData = {};
  
  for (const project of projects) {
    const invoices = invoicesByProject[project.name] || [];
    const payments = paymentsByProject[project.name] || [];
    
    if (invoices.length > 0 || payments.length > 0) {
      let totalProfit = 0;
      let cashTotal = 0;
      let bankTotal = 0;
      let creditTotal = 0;
      
      for (const si of invoices) {
        totalProfit += si.grand_total || 0;
      }
      
      for (const pe of payments) {
        const mode = (pe.mode_of_payment || '').toLowerCase().trim();
        const amount = pe.paid_amount || 0;
        if (mode === 'cash') {
          cashTotal += amount;
        } else if (mode === 'credit' || mode === 'credit card') {
          creditTotal += amount;
        } else {
          bankTotal += amount;
        }
      }
      
      enrichedData[project.name] = {
        profit: totalProfit,
        cash: cashTotal,
        bank: bankTotal,
        credit: creditTotal,
        invoiceNames: invoices.map(i => i.name),
        hasInvoiceData: true
      };
    }
  }
  
  return enrichedData;
};


// --- INEX Accessories (Item Management) API ---

// Branch config: prefix and warehouse mapping
const INEX_BRANCH_CONFIG = {
  'INEX Perumbavoor': { prefix: 'IP', warehouse: 'Stores - IA' },
  'INEX Kaloor': { prefix: 'IK', warehouse: 'Stores - IA' },
  'INEX Thodupuzha': { prefix: 'IT', warehouse: 'Stores - IT' },
};

export const getINEXBranchConfig = () => INEX_BRANCH_CONFIG;

export const fetchINEXItems = async (prefix) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Item?filters=[["item_code","like","${prefix}%"]]&fields=["item_code","item_name","item_group","stock_uom","disabled","custom_unit_qty"]&limit_page_length=0&order_by=item_code asc`, {
      headers: getHeaders(),
      credentials: 'omit',
    });
    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to fetch INEX items');
    }
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching INEX items", error);
    return [];
  }
};

export const getNextINEXItemId = async (prefix) => {
  try {
    const items = await fetchINEXItems(prefix);
    let maxNum = 0;
    // Matches prefix followed by optional whitespace and digits (e.g. IP1, IP 17 COVER, IK1, IT1)
    // Correctly detects existing items up to 17 in Perumbavoor so next ID is IP18
    const regex = new RegExp(`^${prefix}\\s*(\\d+)`, 'i');
    items.forEach(item => {
      const code = (item.item_code || '').trim();
      const match = code.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `${prefix}${maxNum + 1}`;
  } catch (error) {
    console.error("Error getting next INEX item ID", error);
    return `${prefix}1`;
  }
};

export const createINEXItem = async ({ itemCode, itemName, uom, warehouse, quantity }) => {
  try {
    const payload = {
      item_code: itemCode,
      item_name: itemName,
      item_group: 'Products',
      stock_uom: uom || 'Nos',
      is_stock_item: 1,
      item_defaults: [
        {
          company: 'INEX Accessories',
          default_warehouse: warehouse
        }
      ]
    };

    // Save quantity to custom_unit_qty (avoids ERPNext opening_stock ledger locks so items can be deleted freely)
    if (quantity !== undefined && quantity !== null && quantity !== '') {
      payload.custom_unit_qty = quantity.toString();
    }

    const res = await fetch(`${API_URL}/api/resource/Item`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to create INEX item');
    }

    const data = await res.json();
    const created = data.data;

    // ERPNext may name the item using naming series (e.g. STO-ITEM-YYYY-#####) instead of custom itemCode.
    // If name differs from requested itemCode, rename it so it matches requested ID and shows in listing.
    if (created && created.name && itemCode && created.name !== itemCode.trim()) {
      try {
        const renameRes = await fetch(`${API_URL}/api/method/frappe.client.rename_doc`, {
          method: 'POST',
          headers: getHeaders(),
          credentials: 'omit',
          body: JSON.stringify({
            doctype: 'Item',
            old_name: created.name,
            new_name: itemCode.trim()
          })
        });
        if (renameRes.ok) {
          created.name = itemCode.trim();
          created.item_code = itemCode.trim();
        }
      } catch (renameErr) {
        console.warn("Could not rename item to " + itemCode, renameErr);
      }
    }

    return created;
  } catch (error) {
    console.error("Error creating INEX item", error);
    throw error;
  }
};

export const updateINEXItem = async (itemCode, updateData) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Item/${encodeURIComponent(itemCode)}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'omit',
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      throw await extractFrappeError(res, 'Failed to update INEX item');
    }

    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error updating INEX item", error);
    throw error;
  }
};

export const deleteINEXItem = async (itemCode) => {
  try {
    const res = await fetch(`${API_URL}/api/resource/Item/${encodeURIComponent(itemCode)}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'omit',
    });

    if (!res.ok) {
      const err = await extractFrappeError(res, 'Failed to delete INEX item');
      const errStr = (err.message || '').toLowerCase();
      // If ERPNext blocks deletion due to stock ledger entries or links, disable it instead
      if (errStr.includes('stock ledger entry') || errStr.includes('linked with') || errStr.includes('disable this item')) {
        await updateINEXItem(itemCode, { disabled: 1 });
        return { success: true, disabled: true };
      }
      throw err;
    }

    return { success: true, deleted: true };
  } catch (error) {
    console.error("Error deleting INEX item", error);
    throw error;
  }
};

export const toggleINEXItemStatus = async (itemCode, currentDisabled) => {
  const newDisabled = currentDisabled ? 0 : 1;
  await updateINEXItem(itemCode, { disabled: newDisabled });
  return newDisabled;
};

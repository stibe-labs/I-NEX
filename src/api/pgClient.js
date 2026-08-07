// Base URL for the PostgreSQL Backend Server
// For local development, this points to localhost:3060
// In production, we'll configure Nginx to proxy /pg-api to the backend, or use a direct URL
const PG_API_URL = process.env.NODE_ENV === 'production' 
  ? 'http://inex.hnatax.in/pg-api'
  : 'http://localhost:3060/api';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

export const fetchAccessories = async () => {
  try {
    const res = await fetch(`${PG_API_URL}/accessories`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch accessories');
    return await res.json();
  } catch (error) {
    console.error('fetchAccessories error:', error);
    throw error;
  }
};

export const saveAccessory = async (data) => {
  try {
    const res = await fetch(`${PG_API_URL}/accessories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save accessory');
    return await res.json();
  } catch (error) {
    console.error('saveAccessory error:', error);
    throw error;
  }
};

export const fetchExpenses = async () => {
  try {
    const res = await fetch(`${PG_API_URL}/expenses`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return await res.json();
  } catch (error) {
    console.error('fetchExpenses error:', error);
    throw error;
  }
};

export const saveExpense = async (data) => {
  try {
    const res = await fetch(`${PG_API_URL}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save expense');
    return await res.json();
  } catch (error) {
    console.error('saveExpense error:', error);
    throw error;
  }
};

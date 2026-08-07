import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 3060;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'inex_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'inex_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// --- Accessories API ---

// Create an accessory entry
app.post('/api/accessories', async (req, res) => {
  const { item_code, particular, cash, bank, created_by } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO accessories (item_code, particular, cash, bank, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [item_code, particular, cash || 0, bank || 0, created_by || 'Admin']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error inserting accessory:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all accessories
app.get('/api/accessories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM accessories ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accessories:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// --- Expense & Income API ---

// Create an expense/income entry
app.post('/api/expenses', async (req, res) => {
  const { type, particular, cash, bank, created_by } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO expenses (type, particular, cash, bank, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [type, particular, cash || 0, bank || 0, created_by || 'Admin']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error inserting expense/income:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all expenses/income
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(port, () => {
  console.log(`I-NEX Backend running on port ${port}`);
});

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const pool = require('./db'); // PostgreSQL pool
const axios = require('axios');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// --- STATIC FILES (must be before routes!) ---
//const staticPath = path.join(__dirname, '../../../');
const staticPath = path.join(__dirname, '../../../');
console.log('Serving static files from:', staticPath);
app.use(express.static(staticPath));

console.log("=== THIS IS THE CORRECT SERVER FILE ===");

// CORS configuration
app.use(cors({
  origin: [
    'https://css152l-render.onrender.com', 
    'https://css152l.onrender.com',
    'https://css152l-1.onrender.com',
    'http://127.0.0.1:5502',
    'http://127.0.0.1:5505',
    'http://localhost:5502',
    'http://127.0.0.1:3001',  
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:5505'
    
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Middleware
app.use(express.json());

// Serve static images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// --- Authentication Routes ---

// Register new user
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  console.log('Registration attempt:', { email }); // Log registration attempt

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if user already exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully'); // Log successful hashing

    // Insert new user
    await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2)',
      [email, hashedPassword]
    );
    console.log('User inserted successfully'); // Log successful insertion

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Detailed registration error:', err); // More detailed error logging
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Login user
          /* '/api/index/ */
app.post('/api/index', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ message: 'Login successful' });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this endpoint to fetch the latest registered user's email
app.get('/api/latest-email', async (req, res) => {
  try {
    const result = await pool.query('SELECT email FROM users ORDER BY id DESC LIMIT 1');
    if (result.rows.length > 0) {
      res.json({ email: result.rows[0].email });
    } else {
      res.json({ email: null });
    }
  } catch (err) {
    console.error('Error fetching latest email:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Database Routes ---

// Get menu items
app.get('/api/wings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_items ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching menu items:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Save cart item to DB
app.post('/api/cart', async (req, res) => {
  const { name, quantity, subtotal } = req.body;

  try {
    await pool.query(
      'INSERT INTO cart_items (name, quantity, subtotal) VALUES ($1, $2, $3)',
      [name, quantity, subtotal]
    );
    res.status(200).json({ message: 'Item added to cart successfully' });
  } catch (err) {
    console.error('Error inserting cart item:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all cart items
app.get('/api/cart', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cart_items ORDER BY "added_at" DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cart items:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- PayMongo Integration ---

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_HEADERS = {
  headers: {
    Authorization: 'Basic ' + Buffer.from(PAYMONGO_SECRET + ':').toString('base64'),
    'Content-Type': 'application/json'
  }
};

// Create GCash Payment
app.post('/api/payment', async (req, res) => {
  const {
    name,
    email,
    address,
    city,
    province,
    postal,
    cart
  } = req.body;

  if (!name || !email || !address || !city || !province || !postal || !cart || cart.length === 0) {
    return res.status(400).json({ error: 'Missing required info or empty cart' });
  }

  try {
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const amount = Math.round(total * 100); // Convert to centavos

    // Step 1: Create PayMongo GCash Source
    const sourceResponse = await axios.post(
      'https://api.paymongo.com/v1/sources',
      {
        data: {
          attributes: {
            amount: amount,
            redirect: {
              success: 'https://css152l-render.onrender.com/thankyou.html', // Change this later
              failed: 'http://localhost:3000/failed.html'
            },
            type: 'gcash',
            currency: 'PHP'
          }
        }
      },
      PAYMONGO_HEADERS
    );

    const sourceData = sourceResponse.data.data;
    const checkoutUrl = sourceData.attributes.redirect.checkout_url;

    // Step 2: Save order to PostgreSQL
    await pool.query(
      'INSERT INTO orders (customer_name, customer_email, address, city, province, postal, total_amount, payment_intent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [name, email, address, city, province, postal, total, sourceData.id]
    );

    // Optional: Save a payment session or cart ID
    await pool.query(
      'INSERT INTO payment_sessions (paymongo_id, cart_id, paid) VALUES ($1, $2, $3)',
      [sourceData.id, 1, false]
    );

    // Step 3: Send checkout URL to frontend
    res.status(200).json({ redirectUrl: checkoutUrl });

  } catch (err) {
    console.error('GCash Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});




// --- Inventory Routes ---

// Get all inventory items
app.get('/api/inventory', async (req, res) => {
  console.log('GET /api/inventory request received'); // Debug log
  try {
    const result = await pool.query('SELECT * FROM inventory_items ORDER BY date_added DESC');
    console.log('Query result:', result.rows); // Debug log
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new inventory item
app.post('/api/inventory', async (req, res) => {
  console.log('POST /api/inventory request received:', req.body); // Debug log
  const { name, quantity, price, category } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO inventory_items (name, quantity, price, category) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, quantity, price, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error adding inventory item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inventory item
app.put('/api/inventory/:id', async (req, res) => {
  console.log('PUT /api/inventory request received:', req.params.id, req.body); // Debug log
  const { id } = req.params;
  const { name, quantity, price, category, usage } = req.body;
  try {
    let result;
    if (typeof usage !== 'undefined' && (typeof name === 'undefined' && typeof quantity === 'undefined' && typeof price === 'undefined' && typeof category === 'undefined')) {
      // Only usage is being updated
      result = await pool.query(
        'UPDATE inventory_items SET usage = $1 WHERE id = $2 RETURNING *',
        [usage, id]
      );
    } else {
      // Update all fields (including usage if present)
      result = await pool.query(
        'UPDATE inventory_items SET name = COALESCE($1, name), quantity = COALESCE($2, quantity), price = COALESCE($3, price), category = COALESCE($4, category), usage = COALESCE($5, usage) WHERE id = $6 RETURNING *',
        [name, quantity, price, category, usage, id]
      );
    }
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete inventory item
app.delete('/api/inventory/:id', async (req, res) => {
  console.log('DELETE /api/inventory request received:', req.params.id); // Debug log
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM inventory_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// In server.js (or your main backend file)
app.get('/api/payment-session/:cartId', async (req, res) => {
  const { cartId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM payment_sessions WHERE cart_id = $1', [cartId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment session not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
    
// --- Root Route ---
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

// Simple test route to verify server is running
app.get('/test', (req, res) => {
  res.send('Test route is working!');
});

// Test database connection at startup
pool.query('SELECT NOW()')
  .then(res => console.log('Database connection test successful:', res.rows[0]))
  .catch(err => console.error('Database connection test failed:', err));

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Available routes:');
  console.log('- GET /api/inventory');
  console.log('- POST /api/inventory');
  console.log('- PUT /api/inventory/:id');
  console.log('- DELETE /api/inventory/:id');
  console.log('- GET /test');
});

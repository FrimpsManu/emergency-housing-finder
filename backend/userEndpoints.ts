import { Router } from "express";
import { Pool } from "pg";
import { sendPhoneVerification, sendEmailVerification, verifyPhoneCode, verifyEmailCode } from './verificationService';

const userRouter = Router();

// PostgreSQL connection pool configured for Aiven
const pool = new Pool({
  host: process.env.AIVEN_HOST,
  port: parseInt(process.env.AIVEN_PORT || '19049'),
  database: process.env.AIVEN_DBNAME,
  user: process.env.AIVEN_USER,
  password: process.env.AIVEN_PASSWORD,
  ssl: process.env.AIVEN_SSL === 'require' ? { rejectUnauthorized: false } : false,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to Aiven PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Create or update user contact
// Update createUser function to accept location
async function createUser(req, res) {
  let { email, phone, webhook_url, alert_enabled, latitude, longitude } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  // Normalize phone number
  phone = phone.replace(/[\s\-\(\)]/g, '');

  // Phone validation
  if (!/^\+?[1-9]\d{1,14}$/.test(phone)) {
    return res.status(400).json({ 
      error: "Invalid phone format. Use E.164 format (e.g., +1234567890)" 
    });
  }

  // Email validation (if provided)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    // ✨ CHECK IF PHONE NUMBER ALREADY EXISTS
    const existingUser = await pool.query(
      'SELECT id, phone, email, alert_enabled FROM user_contacts WHERE phone = $1',
      [phone]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      
      // Phone number already registered
      return res.status(409).json({ 
        error: "Phone number already registered",
        message: "This phone number is already receiving disaster alerts.",
        data: {
          phone: user.phone,
          email: user.email,
          alert_enabled: user.alert_enabled,
          registered: true
        }
      });
    }

    // ✨ CHECK IF EMAIL ALREADY EXISTS (optional, if you want email to be unique too)
    if (email) {
      const existingEmail = await pool.query(
        'SELECT id, phone, email FROM user_contacts WHERE email = $1',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ 
          error: "Email already registered",
          message: "This email is already associated with another account.",
          data: {
            email: existingEmail.rows[0].email,
            registered: true
          }
        });
      }
    }

    // Proceed with registration if no duplicates found
    const query = `
      INSERT INTO user_contacts 
      (phone, email, webhook_url, alert_enabled, latitude, longitude, phone_verified, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    
    const values = [
      phone,
      email || null,
      webhook_url || null,
      alert_enabled !== undefined ? alert_enabled : true,
      latitude || null,
      longitude || null,
      false, // Don't auto-verify phone - require verification
      false  // Don't auto-verify email - require verification
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error creating user:", error);
    
    // Handle unique constraint violation (if you add it later)
    if (error.code === '23505') { // PostgreSQL unique violation error code
      return res.status(409).json({ 
        error: "Phone number or email already exists",
        message: "This contact information is already registered."
      });
    }
    
    res.status(500).json({ 
      error: "Failed to register user", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}
// Get user by user_id
async function getUser(req, res) {
  const { id } = req.params;

  try {
    const query = "SELECT * FROM user_contacts WHERE id = $1";
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
}

// Get all users (with optional filters)
async function getAllUsers(req, res) {
  const { alert_enabled, limit = 100, offset = 0 } = req.query;

  try {
    let query = "SELECT * FROM user_contacts";
    const values: any[] = [];
    let paramCount = 1;

    if (alert_enabled !== undefined) {
      query += ` WHERE alert_enabled = $${paramCount++}`;
      values.push(alert_enabled === 'true');
    }

    query += " ORDER BY created_at DESC";
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, values);

    // Get total count
    const countQuery = alert_enabled !== undefined 
      ? "SELECT COUNT(*) FROM user_contacts WHERE alert_enabled = $1"
      : "SELECT COUNT(*) FROM user_contacts";
    const countValues = alert_enabled !== undefined ? [alert_enabled === 'true'] : [];
    const countResult = await pool.query(countQuery, countValues);

    res.json({
      success: true,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].count),
      data: result.rows
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// Update user contact information
async function updateUser(req, res) {
  const { user_id } = req.params;
  const { email, phone, webhook_url, alert_enabled } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  // Validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    return res.status(400).json({ 
      error: "Invalid phone format. Use E.164 format (e.g., +1234567890)" 
    });
  }

  try {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (webhook_url !== undefined) {
      updates.push(`webhook_url = $${paramCount++}`);
      values.push(webhook_url);
    }
    if (alert_enabled !== undefined) {
      updates.push(`alert_enabled = $${paramCount++}`);
      values.push(alert_enabled);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(user_id);

    const query = `
      UPDATE user_contacts 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
}

// Delete user
async function deleteUser(req, res) {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  try {
    const query = "DELETE FROM user_contacts WHERE user_id = $1 RETURNING *";
    const result = await pool.query(query, [user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
}

// Toggle alert status
async function toggleAlerts(req, res) {
  const { user_id } = req.params;
  const { alert_enabled } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }

  if (typeof alert_enabled !== 'boolean') {
    return res.status(400).json({ error: "alert_enabled must be a boolean" });
  }

  try {
    const query = `
      UPDATE user_contacts 
      SET alert_enabled = $1
      WHERE user_id = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [alert_enabled, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      message: `Alerts ${alert_enabled ? 'enabled' : 'disabled'}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error toggling alerts:", error);
    res.status(500).json({ error: "Failed to toggle alerts" });
  }
}

// Health check endpoint
async function healthCheck(req, res) {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      message: "Database connection is healthy",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
}

// Helper function for alertService.ts
export async function getUserDetailsFromDB(userId: string) {
  try {
    const query = `
      SELECT 
        id, 
        email, 
        phone, 
        webhook_url, 
        alert_enabled,
        phone_verified,
        email_verified
      FROM user_contacts 
      WHERE id = $1 AND alert_enabled = true
    `;
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
}

// Helper function to get all users with alerts enabled
export async function getAllAlertEnabledUsers() {
  try {
    const query = `
      SELECT user_id, email, phone, webhook_url
      FROM user_contacts 
      WHERE alert_enabled = true
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching alert-enabled users:", error);
    return [];
  }
}

// Send phone verification code
async function sendPhoneVerificationCode(req, res) {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, phone FROM user_contacts WHERE id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const { id, phone } = result.rows[0];

    if (!phone) {
      return res.status(400).json({ error: "No phone number on file" });
    }

    const sent = await sendPhoneVerification(id, phone);

    if (sent) {
      res.json({
        success: true,
        message: "Verification code sent to your phone"
      });
    } else {
      res.status(500).json({ error: "Failed to send verification code" });
    }
  } catch (error) {
    console.error("Error sending phone verification:", error);
    res.status(500).json({ error: "Failed to send verification code" });
  }
}

// Send email verification code
async function sendEmailVerificationCode(req, res) {
  const { user_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, email FROM user_contacts WHERE id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const { id, email } = result.rows[0];

    if (!email) {
      return res.status(400).json({ error: "No email on file" });
    }

    const sent = await sendEmailVerification(id, email);

    if (sent) {
      res.json({
        success: true,
        message: "Verification code sent to your email"
      });
    } else {
      res.status(500).json({ error: "Failed to send verification code" });
    }
  } catch (error) {
    console.error("Error sending email verification:", error);
    res.status(500).json({ error: "Failed to send verification code" });
  }
}

// Verify phone code
async function verifyPhone(req, res) {
  const { user_id } = req.params;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Verification code is required" });
  }

  try {
    const verified = await verifyPhoneCode(parseInt(user_id), code);

    if (verified) {
      res.json({
        success: true,
        message: "Phone number verified successfully"
      });
    } else {
      res.status(400).json({ 
        error: "Invalid or expired verification code" 
      });
    }
  } catch (error) {
    console.error("Error verifying phone:", error);
    res.status(500).json({ error: "Failed to verify phone" });
  }
}

// Verify email code
async function verifyEmail(req, res) {
  const { user_id } = req.params;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Verification code is required" });
  }

  try {
    const verified = await verifyEmailCode(parseInt(user_id), code);

    if (verified) {
      res.json({
        success: true,
        message: "Email verified successfully"
      });
    } else {
      res.status(400).json({ 
        error: "Invalid or expired verification code" 
      });
    }
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
}

// Routes
userRouter.post("/users", createUser);  // Changed function name
userRouter.get("/users/:id", getUser);  // Changed param name
userRouter.put("/users/:id", updateUser);
userRouter.delete("/users/:id", deleteUser);
userRouter.patch("/users/:id/alerts", toggleAlerts);
userRouter.post("/users/:user_id/verify/phone/send", sendPhoneVerificationCode);
userRouter.post("/users/:user_id/verify/email/send", sendEmailVerificationCode);
userRouter.post("/users/:user_id/verify/phone", verifyPhone);
userRouter.post("/users/:user_id/verify/email", verifyEmail);
userRouter.get("/health", healthCheck);

export default userRouter;
export { pool };
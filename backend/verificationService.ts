import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { pool } from './userEndpoints';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate a random 6-digit code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS verification code
export async function sendPhoneVerification(userId: number, phone: string): Promise<boolean> {
  try {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database
    await pool.query(
      `UPDATE user_contacts 
       SET phone_verification_code = $1, 
           phone_verification_expires = $2 
       WHERE id = $3`,
      [code, expiresAt, userId]
    );

    // Send SMS
    await twilioClient.messages.create({
      body: `Your verification code is: ${code}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    console.log(`Phone verification code sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to send phone verification:', error);
    return false;
  }
}

// Send email verification code
export async function sendEmailVerification(userId: number, email: string): Promise<boolean> {
  try {
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store code in database
    await pool.query(
      `UPDATE user_contacts 
       SET email_verification_code = $1, 
           email_verification_expires = $2 
       WHERE id = $3`,
      [code, expiresAt, userId]
    );

    // Send email
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Disaster Alert System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code expires in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });

    console.log(`Email verification code sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to send email verification:', error);
    return false;
  }
}

// Verify phone code
export async function verifyPhoneCode(userId: number, code: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT phone_verification_code, phone_verification_expires 
       FROM user_contacts 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const { phone_verification_code, phone_verification_expires } = result.rows[0];

    // Check if code matches and hasn't expired
    if (phone_verification_code === code && new Date() < new Date(phone_verification_expires)) {
      // Mark as verified
      await pool.query(
        `UPDATE user_contacts 
         SET phone_verified = true, 
             phone_verification_code = NULL, 
             phone_verification_expires = NULL 
         WHERE id = $1`,
        [userId]
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to verify phone code:', error);
    return false;
  }
}

// Verify email code
export async function verifyEmailCode(userId: number, code: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT email_verification_code, email_verification_expires 
       FROM user_contacts 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const { email_verification_code, email_verification_expires } = result.rows[0];

    // Check if code matches and hasn't expired
    if (email_verification_code === code && new Date() < new Date(email_verification_expires)) {
      // Mark as verified
      await pool.query(
        `UPDATE user_contacts 
         SET email_verified = true, 
             email_verification_code = NULL, 
             email_verification_expires = NULL 
         WHERE id = $1`,
        [userId]
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to verify email code:', error);
    return false;
  }
}
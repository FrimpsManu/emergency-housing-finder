import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Twilio setup for SMS
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Nodemailer setup for email
const emailTransporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

interface User {
  phone: string;
  email: string;
  name: string;
}

// Get user details from database
async function getUserDetails(userId: string): Promise<User | null> {
  // Replace with your actual database query
  // Example: return db.users.findById(userId);
  return null;
}

export async function sendAlert(userId: string, disasters: any[]) {
  const user = await getUserDetails(userId);
  if (!user) return;

  const disasterSummary = disasters.map(d => 
    `${d.title || d.category}: ${d.description || 'Active in your area'}`
  ).join('\n');

  // Send SMS
  try {
    await twilioClient.messages.create({
      body: `⚠️ Natural Disaster Alert!\n\n${disasterSummary}\n\nStay safe and follow local authorities' guidance.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phone
    });
  } catch (error) {
    console.error('SMS alert failed:', error);
  }

  // Send Email
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: '⚠️ Natural Disaster Alert in Your Area',
      html: `
        <h2>Natural Disaster Alert</h2>
        <p>Hello ${user.name},</p>
        <p>We've detected the following disaster(s) near your location:</p>
        <ul>
          ${disasters.map(d => `<li><strong>${d.title || d.category}</strong>: ${d.description || 'Active in your area'}</li>`).join('')}
        </ul>
        <p>Please stay safe and follow guidance from local authorities.</p>
      `
    });
  } catch (error) {
    console.error('Email alert failed:', error);
  }
}
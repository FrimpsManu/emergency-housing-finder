import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { getUserDetailsFromDB } from './userEndpoints';

// Twilio setup for SMS
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Nodemailer setup for email
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function sendAlert(userId: string, disasters: any[]) {
  const user = await getUserDetailsFromDB(userId);
  
  // Don't send alerts if user doesn't exist or alerts are disabled
  if (!user || !user.alert_enabled) {
    console.log(`Skipping alert for user ${userId} - not found or alerts disabled`);
    return;
  }

  const disasterSummary = disasters.map(d => 
    `${d.title || d.category}: ${d.description || 'Active in your area'}`
  ).join('\n');

  // Only send SMS if phone exists and is verified
  if (user.phone && user.phone_verified) {
    try {
      await twilioClient.messages.create({
        body: `⚠️ Natural Disaster Alert!\n\n${disasterSummary}\n\nStay safe and follow local authorities' guidance.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone
      });
      console.log(`SMS sent to verified user ${user.id} at ${user.phone}`);
    } catch (error) {
      console.error(`SMS alert failed for user ${user.id}:`, error);
    }
  } else if (user.phone && !user.phone_verified) {
    console.log(`Skipping SMS for user ${user.id} - phone not verified`);
  }

  // Only send email if email exists and is verified
  if (user.email && user.email_verified) {
    try {
      await emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: '⚠️ Natural Disaster Alert in Your Area',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Natural Disaster Alert</h2>
            <p>Hello,</p>
            <p>We've detected the following disaster(s) near your location:</p>
            <ul style="background-color: #fef2f2; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0;">
              ${disasters.map(d => `
                <li style="margin-bottom: 10px;">
                  <strong>${d.title || d.category}</strong>: ${d.description || 'Active in your area'}
                </li>
              `).join('')}
            </ul>
            <p style="font-weight: bold; color: #991b1b;">Please stay safe and follow guidance from local authorities.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280;">
              You're receiving this alert because you signed up for disaster notifications. 
              To manage your alert settings, use your user ID: ${user.id}
            </p>
          </div>
        `
      });
      console.log(`Email sent to verified user ${user.id} at ${user.email}`);
    } catch (error) {
      console.error(`Email alert failed for user ${user.id}:`, error);
    }
  } else if (user.email && !user.email_verified) {
    console.log(`Skipping email for user ${user.id} - email not verified`);
  }

  // Log if no verified contact methods
  if ((!user.phone || !user.phone_verified) && (!user.email || !user.email_verified)) {
    console.warn(`User ${user.id} has no verified contact methods - cannot send alert`);
  }
}

// Send alert to multiple users
export async function sendAlertToMultipleUsers(userIds: string[], disasters: any[]) {
  const results = await Promise.allSettled(
    userIds.map(userId => sendAlert(userId, disasters))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`Alert batch complete: ${successful} successful, ${failed} failed`);
  
  return { successful, failed };
}

// Send alerts to all users in a specific location radius
export async function sendAlertsForLocation(lat: number, lng: number, radius: number, disasters: any[]) {
  // This would require a location table - for now, just get all alert-enabled users
  const { getAllAlertEnabledUsers } = await import('./userEndpoints');
  const users = await getAllAlertEnabledUsers();
  
  console.log(`Sending disaster alerts to ${users.length} users for location (${lat}, ${lng})`);
  
  const userIds = users.map(u => u.id.toString());
  return sendAlertToMultipleUsers(userIds, disasters);
}
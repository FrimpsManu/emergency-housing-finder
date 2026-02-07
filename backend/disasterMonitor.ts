import { getAllAlertEnabledUsers } from './userEndpoints';
import { sendAlert } from './alertService';
import axios from 'axios';

const AMBEE_API_KEY = process.env.AMBEE_API_KEY || "";

// Risk level classification
function assessRisk(disaster: any): 'low' | 'medium' | 'high' {
  const severity = disaster.severity?.toLowerCase() || '';
  const category = disaster.category?.toLowerCase() || '';
  
  // High risk disasters
  if (
    severity.includes('extreme') || 
    severity.includes('high') ||
    category.includes('earthquake') ||
    category.includes('tsunami') ||
    category.includes('hurricane')
  ) {
    return 'high';
  }
  
  // Medium risk disasters
  if (
    severity.includes('moderate') || 
    severity.includes('medium') ||
    category.includes('flood') ||
    category.includes('wildfire') ||
    category.includes('tornado')
  ) {
    return 'medium';
  }
  
  return 'low';
}

// Fetch disasters for a specific location
async function fetchDisastersForLocation(lat: number, lng: number) {
  try {
    const response = await axios.get(
      `https://api.ambeedata.com/disasters/latest/by-lat-lng`,
      {
        params: { lat, lng },
        headers: {
          'x-api-key': AMBEE_API_KEY,
          'Content-type': 'application/json'
        }
      }
    );
    
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching disasters for (${lat}, ${lng}):`, error);
    return [];
  }
}

// Check disasters for a single user
export async function checkDisastersForUser(user: any) {
  try {
    // Skip if user doesn't have a location
    // You'll need to add lat/lng columns to user_contacts table
    // For now, using a default location or skipping
    if (!user.latitude || !user.longitude) {
      console.log(`Skipping user ${user.id} - no location data`);
      return;
    }

    const disasters = await fetchDisastersForLocation(user.latitude, user.longitude);
    
    if (disasters.length === 0) {
      console.log(`No disasters found for user ${user.id}`);
      return;
    }

    // Filter for medium to high risk disasters
    const alertWorthyDisasters = disasters.filter((d: any) => {
      const risk = assessRisk(d);
      return risk === 'medium' || risk === 'high';
    });

    if (alertWorthyDisasters.length > 0) {
      console.log(`🚨 Found ${alertWorthyDisasters.length} alert-worthy disasters for user ${user.id}`);
      await sendAlert(user.id.toString(), alertWorthyDisasters);
    } else {
      console.log(`✓ User ${user.id} safe - only low-risk events nearby`);
    }
  } catch (error) {
    console.error(`Error checking disasters for user ${user.id}:`, error);
  }
}

// Check disasters for all users
export async function checkDisastersForAllUsers() {
  console.log('Starting disaster check for all users...');
  
  try {
    const users = await getAllAlertEnabledUsers();
    console.log(`Checking disasters for ${users.length} users`);

    if (users.length === 0) {
      console.log('No users to check');
      return;
    }

    // Check each user (you might want to batch this in production)
    const results = await Promise.allSettled(
      users.map(user => checkDisastersForUser(user))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Disaster check complete: ${successful} successful, ${failed} failed`);
    
    return { successful, failed, total: users.length };
  } catch (error) {
    console.error('Error in checkDisastersForAllUsers:', error);
    throw error;
  }
}

// Check disasters for a specific location (useful for testing)
export async function checkDisastersForLocation(lat: number, lng: number) {
  try {
    console.log(`Checking disasters for location (${lat}, ${lng})`);
    
    const disasters = await fetchDisastersForLocation(lat, lng);
    
    if (disasters.length === 0) {
      return { disasters: [], alertWorthy: [] };
    }

    const alertWorthyDisasters = disasters.filter((d: any) => {
      const risk = assessRisk(d);
      return risk === 'medium' || risk === 'high';
    });

    console.log(`Found ${disasters.length} disasters, ${alertWorthyDisasters.length} are alert-worthy`);
    
    return {
      disasters,
      alertWorthy: alertWorthyDisasters
    };
  } catch (error) {
    console.error('Error checking disasters for location:', error);
    throw error;
  }
}
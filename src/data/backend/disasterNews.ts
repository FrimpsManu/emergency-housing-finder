import { Router } from "express";
import axios from 'axios';
import { sendAlert } from "./alertService"; // We'll create this

// {
// continent: "nar"
// created_time: "2026-02-04 00:34:10"
// date: "2026-02-04 00:00:00"
// default_alert_levels: "Green"
// estimated_end_date:null
// event_id: "6982941c720e21fbb395be40"
// event_name: "Special Weather Statement in Vernon"
// event_type: "Misc"
// lat: 31.108563562922676
// lng: -93.18763412355446
// polygon_date: null
// proximity_severity_level: "Low Risk"
// source_event_id: "urn:oid:2.49.0.1.840.0.8bf00bce5fee4c82369a8da65dbbf18da8544235.001.1"
// }

type Alert = {
    category: string;
    severity: string;
}

type Disaster = {
    continent: string;
    created_time: string;
    date: string;
    default_alert_levels: string;
    estimated_end_date: string | null;
    event_id: string;
    event_name: string;
    event_type: string;
    lat: number;
    lng: number;
    polygon_date: string | null;
    proximity_severity_level: string;
    source_event_id: string;
}

const newsRouter = Router();
const ambeeKey = process.env.AMBEE_API_KEY || "";

// Risk level classification
function assessRisk(disaster: Disaster): Alert {
  // Customize based on Ambee's response structure
  const severity: string = disaster.proximity_severity_level?.toLowerCase() || '';
  const category: string = disaster.event_type?.toLowerCase() || '';
  let risk: string = "low";

  if (severity.includes('extreme') || severity.includes('high')) risk = 'high';
  if (severity.includes('moderate') || severity.includes('medium')) risk = 'medium';
  const res: Alert = {
    category: category,
    severity: risk,
  }
  
  return res;
}

async function getNews(req, res) {
  const { lat, lng, userId } = req.query; // Add userId to track who to alert
  
  try {
    const options = {
      method: "GET",
      url: `https://api.ambeedata.com/disasters/latest/by-lat-lng?lat=${lat}&lng=${lng}`,
      headers: {
        "x-api-key": ambeeKey,
        "Content-type": "application/json"
      }
    };
    
    const response = await axios.request(options);
    const disasters = response.data.data || [];
    
    // Check for medium-high risk disasters
    // ensure typed array
    const disastersTyped = disasters as Disaster[];

    const alertWorthy: Disaster[] = disastersTyped.filter((d: Disaster) => {
      const alert = assessRisk(d);
      return alert.severity === 'medium' || alert.severity === 'high';
    });
    // Send alerts if needed
    if (alertWorthy.length > 0 && userId) {
      await sendAlert(userId, alertWorthy);
    }
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching disaster news");
  }
}

newsRouter.get("/news", getNews);
export default newsRouter;
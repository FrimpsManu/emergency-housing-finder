import { Router } from "express";
import { checkDisastersForAllUsers } from "./disasterMonitor";

const webhookRouter = Router();

// Webhook endpoint for periodic disaster checks
webhookRouter.post("/disaster-check", async (req, res) => {
  try {
    // Verify webhook source if needed
    const authHeader = req.headers['x-webhook-secret'];
    if (authHeader !== process.env.WEBHOOK_SECRET) {
      return res.status(401).send("Unauthorized");
    }

    // Check disasters for all registered users
    await checkDisastersForAllUsers();
    res.json({ success: true, message: "Disaster check completed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Check failed" });
  }
});

export default webhookRouter;
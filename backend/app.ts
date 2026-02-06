import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

export default app;
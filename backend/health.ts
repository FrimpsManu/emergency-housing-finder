import {Router} from "express";
import dotenv from "dotenv";

dotenv.config();
const healthRouter = Router();

healthRouter.get("/health", (req, res) => {
    console.log("Health check requested");
    res.status(200).send("OK");
});

export default healthRouter;
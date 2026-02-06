import app from "./app";
import dotenv from "dotenv";
import healthRouter from "./health";
import newsRouter from "./disasterNews";
import userRouter from "./userEndpoints";
import webhookRouter from "./newsWebhook";

dotenv.config();
const PORT = process.env.PORT || 5001;

app.use("/api", healthRouter);
app.use("/api", newsRouter);
app.use("/api", userRouter);
app.use("/api", webhookRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
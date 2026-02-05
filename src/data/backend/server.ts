import app from "./app";
import dotenv from "dotenv";
import healthRouter from "./health";
import newsRouter from "./disasterNews";

dotenv.config();
const PORT = process.env.PORT || 5001;

app.use("/api", healthRouter);
app.use("/api", newsRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
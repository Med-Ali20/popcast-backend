import express from "express";
import { connectToDatabase } from "./db";
import cors from "cors";
import podcastRouter from "./routes/podcast";
import articleRouter from "./routes/article";
import adminRouter from "./routes/admin";

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use("/podcast", podcastRouter);
app.use("/article", articleRouter);
app.use("/admin", adminRouter);

async function startServer() {
  try {
    await connectToDatabase();

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

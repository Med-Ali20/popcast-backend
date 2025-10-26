import express from "express";
import { connectToDatabase } from "./db";
import cors from "cors";
import podcastRouter from "./routes/podcast";
import articleRouter from "./routes/article";
import adminRouter from "./routes/admin";
import categoryRouter from "./routes/category"
import cron from 'node-cron'
import Article from "./models/Article";

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use("/podcast", podcastRouter);
app.use("/article", articleRouter);
app.use("/admin", adminRouter);
app.use("/category", categoryRouter);

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

cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
        
    await Article.updateMany(
      {
        status: 'draft',
        date: { $lte: now }
      },
      {
        $set: { 
          status: 'published',
          date: now
        }
      }
    );
  } catch (error) {
    console.error('Cron job error:', error);
  } 
});

startServer();

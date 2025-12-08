import express from "express";
import { connectToDatabase } from "./db";
import cors from "cors";
import rateLimit from "express-rate-limit";
import podcastRouter from "./routes/podcast";
import articleRouter from "./routes/article";
import adminRouter from "./routes/admin";
import categoryRouter from "./routes/category";
import cron from 'node-cron';
import Article from "./models/Article";

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://3.79.57.91:3000', 'https://itspopcast.com', 'https://www.itspopcast.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for certain IPs (optional)
  // skip: (req) => {
  //   const trustedIPs = ['127.0.0.1'];
  //   return trustedIPs.includes(req.ip);
  // }
});

// Stricter rate limiter for write operations (POST, PUT, DELETE)
const writeOperationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 write requests per windowMs
  message: {
    error: "Too many write requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limiter for admin routes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    error: "Too many admin requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Apply specific rate limiters to routes
app.use("/podcast", podcastRouter);
app.use("/article", articleRouter);
app.use("/category", categoryRouter);

// Apply stricter rate limiter to admin routes
app.use("/admin", adminLimiter, adminRouter);

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
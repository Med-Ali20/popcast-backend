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

// Store blocked IPs in memory (or use Redis/database for persistence)
const blockedIPs = new Set<string>();

// Middleware to check if IP is blocked
const blockMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || '';
  
  if (blockedIPs.has(clientIP)) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  next();
};

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://3.79.57.91:3000', 'https://itspopcast.com', 'https://www.itspopcast.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Apply block middleware to all routes
app.use(blockMiddleware);

// Honeypot routes - hidden routes that should never be accessed by legitimate users
const honeypotRoutes = [
  '/admin/login',
  '/wp-admin',
  '/wp-login.php',
  '/.env',
  '/config.php',
  '/phpmyadmin',
  '/.git/config',
  '/admin/config',
  '/backup.sql',
  '/database.sql'
];

honeypotRoutes.forEach(route => {
  app.all(route, (req, res) => {
    const clientIP = req.ip || req.socket.remoteAddress || '';
    
    // Add IP to blocked list
    blockedIPs.add(clientIP);
    
    // Log the attempt
    console.log(`[SECURITY ALERT] IP ${clientIP} accessed honeypot route: ${route} at ${new Date().toISOString()}`);
    console.log(`Request details:`, {
      method: req.method,
      headers: req.headers,
      userAgent: req.get('user-agent')
    });
    
    // Optionally save to database for persistence
    // await saveBlockedIP(clientIP, route);
    
    // Return a fake response to not reveal it's a honeypot
    res.status(404).json({ error: "Not found" });
  });
});

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    error: "Too many admin requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

app.use("/podcast", podcastRouter);
app.use("/article", articleRouter);
app.use("/category", categoryRouter);
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
import express from "express";
import Admin from "../models/Admin";
import auth from "../middleware/auth";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 8, // Limit each IP to 8 failed login attempts per windowMs
  message: {
    message:
      "Too many failed login attempts from this IP, please try again after 30 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false, // Count failed logins
});

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const token = req.headers.authorization!.split(" ")[1];
    const { isSuperAdmin } = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      id: string;
      username: string;
      isSuperAdmin: boolean;
    };

    if (!isSuperAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const admins = (await Admin.find({}, { password: 0 })).filter(
      (admin) => !admin.isSuperAdmin
    );
    return res.status(200).json(admins);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 registrations per hour per IP
  message: {
    message: "Too many registration attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

router.post("/register", registerLimiter, auth, async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Validate input length and format
    if (username.length < 3 || username.length > 50) {
      return res
        .status(400)
        .json({ message: "Username must be between 3 and 50 characters" });
    }

    if (password.length < 8 || password.length > 100) {
      return res
        .status(400)
        .json({ message: "Password must be between 8 and 100 characters" });
    }

    // Sanitize username (only allow alphanumeric, underscore, hyphen)
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitizedUsername !== username) {
      return res
        .status(400)
        .json({ message: "Username contains invalid characters" });
    }

    const token = req.headers.authorization!.split(" ")[1];
    const { isSuperAdmin } = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      id: string;
      username: string;
      isSuperAdmin: boolean;
    };

    if (!isSuperAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Use findOne instead of find for better performance
    const existingAdmin = await Admin.findOne({ username: sanitizedUsername });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const newAdmin = new Admin({ username: sanitizedUsername, password });
    await newAdmin.save();

    return res.status(201).json({
      username: newAdmin.username,
      id: newAdmin._id,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        isSuperAdmin: admin.isSuperAdmin,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "4h" }
    );
    return res
      .status(200)
      .json({
        token,
        username: admin.username,
        isSuperAdmin: admin.isSuperAdmin,
        id: admin._id,
      });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const adminId = (req as any).admin.id;
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }
    admin.password = newPassword;
    await admin.save();
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.delete("/delete/:id", auth, async (req, res) => {
  const adminId = req.params.id;
  try {
    const token = req.headers.authorization!.split(" ")[1];
    const { isSuperAdmin } = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      id: string;
      username: string;
      isSuperAdmin: boolean;
    };

    if (!isSuperAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    await Admin.findByIdAndDelete(adminId);
    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;

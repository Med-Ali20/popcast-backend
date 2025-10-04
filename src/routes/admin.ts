import express from "express";
import Admin from "../models/Admin";
import auth from "../middleware/auth";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/register", auth, async (req, res) => {
  const { username, password } = req.body;
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

    const existingAdmin = await Admin.find({ username });
    if (existingAdmin.length > 0) {
      return res.status(400).json({ message: "Admin already exists" });
    }
    const newAdmin = new Admin({ username, password });
    await newAdmin.save();
    return res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
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
    return res.status(200).json({ token });
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

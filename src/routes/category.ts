// routes/category.ts
import express from "express";
import Category from "../models/Category";

const router = express.Router();

// Get all categories
router.get("/", async (req, res) => {
  try {
    const type = req.query.type as string;
    const query: any = {};
    
    if (type && type !== 'all') {
      query.$or = [{ type: type }, { type: 'both' }];
    }
    
    const categories = await Category.find(query).sort({ name: 1 });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single category
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
router.post("/", async (req, res) => {
  try {
    const { name  } = req.body;
    
    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    
    const category = new Category({
      name,
    });
    
    await category.save();
    res.status(201).json(category);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Category with this slug already exists" });
    }
    res.status(400).json({ error: error.message });
  }
});

// Update category
router.patch("/:id", async (req, res) => {
  try {
    const { name, description, type } = req.body;
    const updates: any = {};
    
    if (name) {
      updates.name = name;
      updates.slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    }
    if (description !== undefined) updates.description = description;
    if (type) updates.type = type;
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    res.json(category);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete category
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
import mongoose from "mongoose";

// Add scheduling

const ArticleSchema = new mongoose.Schema({
 title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,  // Remove () here - should be Date.now not Date.now()
  },
  tags: {
    type: [String],
    default: []
  },
  thumbnail: {
    type: String,
  },
  // Add these fields to match your router
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  author: {
    type: String,
  },
  category: {
    type: String,
  },
  slug: {
    type: String,
    unique: true,
    sparse: true 
  }
});

const Article = mongoose.model("Article", ArticleSchema);
export default Article
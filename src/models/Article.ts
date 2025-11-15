import mongoose from "mongoose";

// Add scheduling

const ArticleSchema = new mongoose.Schema({
 title: {
    type: String,
    required: true,
    trim: true
  },
 subTitle: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,  
  },
  tags: {
    type: [String],
    default: []
  },
  thumbnail: {
    type: String,
  },
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

ArticleSchema.index({ date: -1 });

const Article = mongoose.model("Article", ArticleSchema);
export default Article
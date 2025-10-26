// models/Podcast.ts
import mongoose from "mongoose";
import { IPodcast } from "../types";

const podcastSchema = new mongoose.Schema<IPodcast>({
  title: {
    type: String,
    required: true,
  },
  audioUrl: {
    type: String,
  },
  videoUrl: {
    type: String,
  },
  description: {
    type: String,
  },
  youtube: {
    type: String,
  },
  spotify: {
    type: String,
  },
  anghami: {
    type: String,
  },
  appleMusic: {
    type: String,
  },
  tags: {
    type: [String],
  },
  thumbnailUrl: {
    type: String,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',  // Reference to Category model
  },
}, { timestamps: true });

// Index for efficient category filtering
podcastSchema.index({ category: 1 });

const Podcast = mongoose.model<IPodcast>("Podcast", podcastSchema);
export default Podcast;
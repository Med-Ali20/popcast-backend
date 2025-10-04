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
    type: String,
  },
}, {timestamps: true});

const Podcast = mongoose.model<IPodcast>("Podcast", podcastSchema);
export default Podcast;

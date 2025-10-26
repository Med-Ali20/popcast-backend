// models/Category.ts
import mongoose from "mongoose";

export interface ICategory extends mongoose.Document {
  name: string;
  slug: string;
  description?: string;
  type: 'podcast' | 'article' | 'both'; // Can be used for podcasts, articles, or both
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new mongoose.Schema<ICategory>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
}, { timestamps: true });


const Category = mongoose.model<ICategory>("Category", categorySchema);
export default Category;
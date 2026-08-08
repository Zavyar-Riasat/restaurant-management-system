import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  mainCategory: mongoose.Types.ObjectId;
  image?: string;
  icon?: string;
  description?: string;
  status: 'Active' | 'Inactive';
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    mainCategory: { type: Schema.Types.ObjectId, ref: 'MainCategory', required: true },
    image: { type: String },
    icon: { type: String },
    description: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

// Force clear the cache so the new icon field is registered without needing to restart the Next.js server
if (mongoose.models.Category) {
  delete mongoose.models.Category;
}

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

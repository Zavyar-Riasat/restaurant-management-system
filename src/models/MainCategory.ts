import mongoose, { Schema, Document } from 'mongoose';

export interface IMainCategory extends Document {
  name: string;
  icon?: string;
  status: 'Active' | 'Inactive';
}

const MainCategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    icon: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

if (mongoose.models.MainCategory) {
  delete mongoose.models.MainCategory;
}

export default mongoose.models.MainCategory || mongoose.model<IMainCategory>('MainCategory', MainCategorySchema);

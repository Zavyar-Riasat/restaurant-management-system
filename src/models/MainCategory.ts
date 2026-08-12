import mongoose, { Schema, Document } from 'mongoose';

export interface IMainCategory extends Document {
  name: string;
  icon?: string;
  status: 'Active' | 'Inactive';
  isDeleted: boolean;
}

const MainCategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    icon: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

if (mongoose.models.MainCategory) {
  delete mongoose.models.MainCategory;
}

export default mongoose.models.MainCategory || mongoose.model<IMainCategory>('MainCategory', MainCategorySchema);

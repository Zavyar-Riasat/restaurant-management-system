import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  mainCategory: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  price: number;
  discountPrice?: number;
  image?: string;
  description?: string;
  availability: boolean;
  status: 'Active' | 'Inactive';
}

const MenuItemSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    mainCategory: { type: Schema.Types.ObjectId, ref: 'MainCategory', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    image: { type: String },
    description: { type: String },
    availability: { type: Boolean, default: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

// Force clear the cache
if (mongoose.models.MenuItem) {
  delete mongoose.models.MenuItem;
}

export default mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

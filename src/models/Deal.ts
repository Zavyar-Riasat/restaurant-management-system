import mongoose, { Schema, Document } from 'mongoose';

export interface IDeal extends Document {
  name: string;
  category: mongoose.Types.ObjectId;
  includedItems: {
    menuItem: mongoose.Types.ObjectId;
    quantity: number;
  }[];
  price: number;
  discount: number;
  description?: string;
  image?: string;
  status: 'Active' | 'Inactive';
  isDeleted: boolean;
}

const DealSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: 'MainCategory', required: true },
    includedItems: [
      {
        menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, default: 1 },
      },
    ],
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    description: { type: String },
    image: { type: String },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Force clear the cache to prevent Next.js hot reload issues
if (mongoose.models.Deal) {
  delete mongoose.models.Deal;
}

export default mongoose.models.Deal || mongoose.model<IDeal>('Deal', DealSchema);

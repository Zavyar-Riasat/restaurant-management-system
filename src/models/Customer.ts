import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  phone: string;
  address?: string;
  email?: string;
  notes?: string;
  outstandingBalance: number;
  status: 'Active' | 'Inactive';
  isDeleted: boolean;
}

const CustomerSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    email: { type: String },
    notes: { type: String },
    outstandingBalance: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

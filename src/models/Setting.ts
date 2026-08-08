import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  restaurantName: string;
  logo?: string;
  address: string;
  phone: string;
  email?: string;
  taxPercentage: number;
  currency: string;
  receiptFooter?: string;
  theme: 'Light' | 'Dark' | 'System';
}

const SettingSchema: Schema = new Schema(
  {
    restaurantName: { type: String, required: true, default: 'My Restaurant' },
    logo: { type: String },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String },
    taxPercentage: { type: Number, default: 5 },
    currency: { type: String, default: '$' },
    receiptFooter: { type: String, default: 'Thank you for your visit!' },
    theme: { type: String, enum: ['Light', 'Dark', 'System'], default: 'System' },
  },
  { timestamps: true }
);

export default mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);

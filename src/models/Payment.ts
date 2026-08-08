import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  order: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId;
  amountPaid: number;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'EasyPaisa' | 'JazzCash';
  cashier: mongoose.Types.ObjectId;
  notes?: string;
}

const PaymentSchema: Schema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    amountPaid: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Bank Transfer', 'EasyPaisa', 'JazzCash'],
      required: true,
    },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

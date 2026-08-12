import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  menuItem?: mongoose.Types.ObjectId;
  deal?: mongoose.Types.ObjectId;
  name: string; // Captured at order time in case menu item changes later
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer?: mongoose.Types.ObjectId;
  customerName: string; // Walk-in customer name or registered name
  customerPhone?: string;
  customerAddress?: string;
  cashier: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  discountAllocation?: Map<string, number>;
  isDeleted: boolean;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  balancePaidDate?: Date;
  paymentHistory: { amount: number; date: Date }[];
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
}

const OrderItemSchema = new Schema({
  menuItem: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
  deal: { type: Schema.Types.ObjectId, ref: 'Deal' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  specialInstructions: { type: String },
});

const OrderSchema: Schema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true, default: 'Walk-in Customer' },
    customerPhone: { type: String },
    customerAddress: { type: String },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountAllocation: { type: Map, of: Number },
    isDeleted: { type: Boolean, default: false },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    amountPaid: { type: Number, required: true, default: 0 },
    balanceDue: { type: Number, default: 0 },
    balancePaidDate: { type: Date },
    paymentHistory: [{
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now }
    }],
    status: {
      type: String,
      enum: ['Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Paid'],
      default: 'Unpaid',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

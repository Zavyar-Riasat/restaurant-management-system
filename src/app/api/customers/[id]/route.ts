import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    if (body.action === 'pay_balance') {
      const paymentAmount = Number(body.paymentAmount);
      if (!paymentAmount || paymentAmount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

      const customer = await Customer.findById(id);
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      if (paymentAmount > customer.outstandingBalance) return NextResponse.json({ error: 'Payment exceeds balance' }, { status: 400 });

      // Find all unpaid orders for this customer, oldest first
      const orders = await Order.find({ 
        customer: id, 
        balanceDue: { $gt: 0 } 
      }).sort({ createdAt: 1 });

      let remainingPayment = paymentAmount;

      for (const order of orders) {
        if (remainingPayment <= 0) break;

        const amountToApply = Math.min(order.balanceDue, remainingPayment);
        
        order.amountPaid += amountToApply;
        order.balanceDue -= amountToApply;
        if (order.balanceDue === 0) {
          order.paymentStatus = 'Paid';
        } else {
          order.paymentStatus = 'Partially Paid';
        }
        
        if (!order.paymentHistory) order.paymentHistory = [];
        order.paymentHistory.push({ amount: amountToApply, date: new Date() });
        order.balancePaidDate = new Date();
        
        await order.save();

        remainingPayment -= amountToApply;
      }

      customer.outstandingBalance = Math.max(0, customer.outstandingBalance - paymentAmount);
      await customer.save();

      return NextResponse.json(customer);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const customer = await Customer.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Customer softly deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

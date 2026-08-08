import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Customer from '@/models/Customer';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    
    if (body.action === 'pay_balance') {
      const paymentAmount = Number(body.paymentAmount);
      if (!paymentAmount || paymentAmount <= 0) return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });

      const order = await Order.findById(id);
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      
      if (paymentAmount > order.balanceDue) {
         return NextResponse.json({ error: 'Payment exceeds balance due' }, { status: 400 });
      }

      if (order.balanceDue > 0) {
        // Decrease customer balance if linked
        if (order.customer) {
          const customer = await Customer.findById(order.customer);
          if (customer) {
            customer.outstandingBalance = Math.max(0, (customer.outstandingBalance || 0) - paymentAmount);
            await customer.save();
          }
        }
        
        // Update order
        order.amountPaid += paymentAmount;
        order.balanceDue -= paymentAmount;
        if (order.balanceDue === 0) {
           order.paymentStatus = 'Paid';
        }
        
        // Add to history
        if (!order.paymentHistory) order.paymentHistory = [];
        order.paymentHistory.push({ amount: paymentAmount, date: new Date() });
        order.balancePaidDate = new Date(); // keeping for easy access to last payment
        
        await order.save();
        
        return NextResponse.json(order);
      } else {
         return NextResponse.json({ error: 'No balance due on this order' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

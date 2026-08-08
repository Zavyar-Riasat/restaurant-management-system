import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import Customer from '@/models/Customer';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate('customer')
      .populate({
        path: 'items.menuItem',
        populate: { path: 'mainCategory' }
      })
      .sort({ createdAt: -1 });
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    
    // Generate unique order number (e.g., ORD-timestamp)
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    
    let customerId = body.customer;

    // If no explicit customerId was provided but they gave a name, find or create one
    if (!customerId && body.customerName && body.customerName.trim() !== '' && body.customerName !== 'Walk-in Customer') {
       let existingCustomer = await Customer.findOne({ name: body.customerName });
       if (!existingCustomer) {
         existingCustomer = await Customer.create({ 
           name: body.customerName, 
           address: body.customerAddress || '',
           phone: body.customerPhone || ''
         });
       }
       customerId = existingCustomer._id;
    }

    const amountPaid = body.amountPaid !== undefined ? Number(body.amountPaid) : body.grandTotal;
    const balanceDue = body.grandTotal - amountPaid;
    
    let paymentStatus = 'Unpaid';
    if (amountPaid >= body.grandTotal) paymentStatus = 'Paid';
    else if (amountPaid > 0) paymentStatus = 'Partially Paid';

    const newOrder = await Order.create({
      ...body,
      orderNumber,
      customer: customerId,
      amountPaid,
      balanceDue,
      status: 'Pending',
      paymentStatus
    });

    // Update customer balance if needed
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (customer && balanceDue > 0) {
        customer.outstandingBalance = (customer.outstandingBalance || 0) + balanceDue;
        await customer.save();
      }
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

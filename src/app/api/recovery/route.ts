import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import MenuItem from '@/models/MenuItem';
import Category from '@/models/Category';
import MainCategory from '@/models/MainCategory';
import Deal from '@/models/Deal';
import Customer from '@/models/Customer';
import Order from '@/models/Order';

export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all deleted items
    const menuItems = await MenuItem.find({ isDeleted: true });
    const categories = await Category.find({ isDeleted: true });
    const mainCategories = await MainCategory.find({ isDeleted: true });
    const deals = await Deal.find({ isDeleted: true });
    const customers = await Customer.find({ isDeleted: true });
    const orders = await Order.find({ isDeleted: true });
    
    // Combine into a generic list
    const trash = [
      ...menuItems.map(item => ({ id: item._id, type: 'MenuItem', name: item.name, deletedAt: item.updatedAt })),
      ...categories.map(item => ({ id: item._id, type: 'Category', name: item.name, deletedAt: item.updatedAt })),
      ...mainCategories.map(item => ({ id: item._id, type: 'MainCategory', name: item.name, deletedAt: item.updatedAt })),
      ...deals.map(item => ({ id: item._id, type: 'Deal', name: item.name, deletedAt: item.updatedAt })),
      ...customers.map(item => ({ id: item._id, type: 'Customer', name: item.name || item.phone, deletedAt: item.updatedAt })),
      ...orders.map(item => ({ id: item._id, type: 'Order', name: item.orderNumber || item._id, deletedAt: item.updatedAt }))
    ].sort((a: any, b: any) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    
    return NextResponse.json(trash);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { id, type } = await req.json();
    
    let model;
    switch (type) {
      case 'MenuItem': model = MenuItem; break;
      case 'Category': model = Category; break;
      case 'MainCategory': model = MainCategory; break;
      case 'Deal': model = Deal; break;
      case 'Customer': model = Customer; break;
      case 'Order': model = Order; break;
      default: return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    
    await model.findByIdAndUpdate(id, { isDeleted: false });
    
    return NextResponse.json({ success: true, message: 'Item restored successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

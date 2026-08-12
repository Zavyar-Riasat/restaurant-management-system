import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import MenuItem from '@/models/MenuItem';
import Category from '@/models/Category';
import MainCategory from '@/models/MainCategory';
import Deal from '@/models/Deal';
import Customer from '@/models/Customer';
import Order from '@/models/Order';
import Setting from '@/models/Setting';

export async function GET() {
  try {
    await dbConnect();
    const backup = {
      menuItems: await MenuItem.find({}),
      categories: await Category.find({}),
      mainCategories: await MainCategory.find({}),
      deals: await Deal.find({}),
      customers: await Customer.find({}),
      orders: await Order.find({}),
      settings: await Setting.find({}),
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(backup);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const backup = await req.json();
    
    // Clear existing data completely
    await MenuItem.deleteMany({});
    await Category.deleteMany({});
    await MainCategory.deleteMany({});
    await Deal.deleteMany({});
    await Customer.deleteMany({});
    await Order.deleteMany({});
    await Setting.deleteMany({});
    
    // Restore data safely
    if (backup.menuItems?.length) await MenuItem.insertMany(backup.menuItems);
    if (backup.categories?.length) await Category.insertMany(backup.categories);
    if (backup.mainCategories?.length) await MainCategory.insertMany(backup.mainCategories);
    if (backup.deals?.length) await Deal.insertMany(backup.deals);
    if (backup.customers?.length) await Customer.insertMany(backup.customers);
    if (backup.orders?.length) await Order.insertMany(backup.orders);
    if (backup.settings?.length) await Setting.insertMany(backup.settings);
    
    return NextResponse.json({ success: true, message: 'Database restored successfully' });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

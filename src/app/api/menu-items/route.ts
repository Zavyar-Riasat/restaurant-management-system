import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import MenuItem from '@/models/MenuItem';
import Category from '@/models/Category';
import MainCategory from '@/models/MainCategory';
import '@/models/Category';
import '@/models/MainCategory';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const searchParams = req.nextUrl.searchParams;
    const categoryId = searchParams.get('category');
    
    const filter = categoryId ? { category: categoryId, isDeleted: { $ne: true } } : { isDeleted: { $ne: true } };
    
    const menuItems = await MenuItem.find(filter).populate('mainCategory').populate('category').sort({ createdAt: -1 });
    return NextResponse.json(menuItems);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const menuItem = await MenuItem.create(body);
    return NextResponse.json(menuItem, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import MainCategory from '@/models/MainCategory';

export async function GET() {
  try {
    await dbConnect();
    let categories = await MainCategory.find({}).sort({ createdAt: -1 });
    
    // Seeding logic
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Desi Food', icon: '🥘', status: 'Active' },
        { name: 'Fast Food', icon: '🍔', status: 'Active' },
        { name: 'Beverages', icon: '🥤', status: 'Active' }
      ];
      await MainCategory.insertMany(defaultCategories);
      categories = await MainCategory.find({}).sort({ createdAt: -1 });
    }
    
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const category = await MainCategory.create(body);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

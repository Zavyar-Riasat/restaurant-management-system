import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Deal from '@/models/Deal';
import MainCategory from '@/models/MainCategory';
import MenuItem from '@/models/MenuItem';
// Ensure MenuItem is registered before populating
import '@/models/MenuItem';

export async function GET() {
  try {
    await dbConnect();
    const deals = await Deal.find({ isDeleted: { $ne: true } })
      .populate('category')
      .populate('includedItems.menuItem')
      .sort({ createdAt: -1 });
    return NextResponse.json(deals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const deal = await Deal.create(body);
    return NextResponse.json(deal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

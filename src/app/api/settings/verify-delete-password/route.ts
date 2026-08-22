import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Setting from '@/models/Setting';

// Verifies a submitted password against the admin-configured "delete order"
// password stored in Settings. Only ever returns { valid: true/false } —
// the actual stored password is never sent back to the client.
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { password } = await req.json();

    const settings = await Setting.findOne();
    const storedPassword = settings?.deletePassword || '';

    // If the admin hasn't set a delete password yet, don't block deletes —
    // this preserves the existing behavior until the admin opts in.
    if (!storedPassword) {
      return NextResponse.json({ valid: true });
    }

    const valid = typeof password === 'string' && password === storedPassword;
    return NextResponse.json({ valid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

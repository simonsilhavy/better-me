import { NextResponse } from 'next/server';
import { getAllDays, getRange, toApiShapes } from '@/lib/entries';
import { isValidDate } from '@/lib/date';

export const dynamic = 'force-dynamic';

// GET /api/entries?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return NextResponse.json({ error: 'from/to must be YYYY-MM-DD' }, { status: 400 });
  }

  try {
    const days = from && to ? await getRange(from, to) : await getAllDays();
    // Flat shape: one object per day, habit keys at the top level — the same
    // JSON the PUT endpoint accepts, so a day can be read and written back.
    return NextResponse.json({
      entries: await toApiShapes(days),
    });
  } catch (error) {
    console.error('GET /api/entries failed', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

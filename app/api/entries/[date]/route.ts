import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getEntry, upsertEntry } from '@/lib/entries';
import { parseEntry } from '@/lib/domain';
import { isValidDate } from '@/lib/date';
import { checkApiToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ date: string }> };

// GET /api/entries/:date
export async function GET(_request: Request, { params }: Params) {
  const { date } = await params;

  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  try {
    const entry = await getEntry(date);
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    console.error('GET /api/entries/:date failed', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// PUT /api/entries/:date — upsert, requires `Authorization: Bearer $API_TOKEN`
export async function PUT(request: Request, { params }: Params) {
  const denied = checkApiToken(request);
  if (denied) return denied;

  const { date } = await params;
  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const entry = await upsertEntry(parseEntry(date, body));
    revalidatePath('/');
    revalidatePath('/history');
    revalidatePath(`/day/${date}`);
    return NextResponse.json({ entry });
  } catch (error) {
    console.error('PUT /api/entries/:date failed', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

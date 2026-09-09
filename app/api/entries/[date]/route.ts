import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getDay, toApiShape, upsertDay } from '@/lib/entries';
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
    const day = await getDay(date);
    if (day.updatedAt === null && Object.keys(day.values).length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ entry: await toApiShape(day) });
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

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }

  try {
    const { ignored } = await upsertDay(date, body as Record<string, unknown>);
    revalidatePath('/');
    revalidatePath('/historie');
    revalidatePath(`/den/${date}`);

    const day = await getDay(date);
    // Unknown keys are named rather than dropped in silence, so a typo in a
    // relayed day shows up instead of looking like a successful write.
    return NextResponse.json({
      entry: await toApiShape(day),
      ...(ignored.length > 0 ? { ignoredKeys: ignored } : {}),
    });
  } catch (error) {
    console.error('PUT /api/entries/:date failed', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

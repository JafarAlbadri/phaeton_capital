import { NextRequest, NextResponse } from 'next/server';
import prisma from '@sentiment-crowd/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const ticker = url.searchParams.get('q') || process.env.TARGET_KEYWORD || 'wallstreetbets';

    const latest = await prisma.sentiment.findFirst({
      where: { ticker: { equals: ticker, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    const rec = await prisma.recommendationScore.findUnique({
      where: { ticker },
      select: { signal: true, composite_score: true, updatedAt: true }
    });

    return NextResponse.json({
      lastScrape: latest?.createdAt ?? null,
      recommendation: rec ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

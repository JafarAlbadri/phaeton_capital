import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const ticker = req.nextUrl.searchParams.get('ticker');
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

    const pythonUrl = process.env.PYTHON_WORKER_URL || 'http://python_worker:8000';
    try {
        const resp = await fetch(`${pythonUrl}/backtest/${encodeURIComponent(ticker.toUpperCase())}?years=2`, {
            method: 'POST',
            signal: AbortSignal.timeout(90000),
        });
        const data = await resp.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backtest service unavailable' }, { status: 503 });
    }
}

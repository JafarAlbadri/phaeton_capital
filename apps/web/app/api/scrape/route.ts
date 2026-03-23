import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        const configuredSecret = process.env.SCRAPE_SECRET;
        
        // If a secret is configured in env, enforce it
        if (configuredSecret && authHeader !== `Bearer ${configuredSecret}`) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        let keyword = undefined;
        try {
            const body = await req.json();
            if (body && body.keyword) keyword = body.keyword;
        } catch (e) {
            // No body provided.
        }

        // In docker-compose, the worker service is accessible at http://worker:8080
        const res = await fetch('http://worker:8080/trigger', {
            method: 'POST',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword })
        });

        if (res.ok) {
            return NextResponse.json({ success: true, message: 'Scrape triggered successfully' });
        } else {
            return NextResponse.json({ success: false, message: 'Worker returned an error' }, { status: 500 });
        }
    } catch (error) {
        console.error('Failed to trigger scrape:', error);
        return NextResponse.json({ success: false, message: 'Could not connect to worker service' }, { status: 500 });
    }
}

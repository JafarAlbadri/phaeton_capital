import { NextResponse } from 'next/server';

export async function POST() {
    try {
        // In docker-compose, the worker service is accessible at http://worker:8080
        const res = await fetch('http://worker:8080/trigger', {
            method: 'POST',
            cache: 'no-store'
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

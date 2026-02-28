# SentimentCrowd

100% Bun-Native Trading Intelligence Pipeline.
Sentiment analysis system identifying genuine market sentiment by scraping Reddit, filtering social media slop, and labeling with Gemini AI.

## Architecture

- **Web:** Next.js 15 App router dashboard.
- **Worker:** Bun-native web scraper and AI pipeline.
- **DB:** PostgreSQL with Prisma ORM.

## Quick Start

### 1. Configure Environment Variables
Copy the template to your actual `.env` file:
```bash
cp .env.example .env
```
Open `.env` and configure your `GEMINI_API_KEY`. (Required for Sentiment AI to work).

### 2. Start the Environment
Everything is containerized and runs via Docker Compose. No local Bun or Node.js installations are required on your host!
```bash
docker-compose up --build
```
This will automatically:
- Stand up PostgreSQL and initialize the database schema via Prisma.
- Start the backend worker pipeline that scrapes and analyzes text.
- Start the Next.js frontend web dashboard.

### 3. View the Dashboard
Go to your browser:
**http://localhost:3000**

### 4. Manual Scrape / Scan
The worker scrapes Reddit automatically every 15 minutes. To trigger a manual scan immediately, use the dashboard button or run this command in your terminal:

```bash
curl -X POST http://localhost:3000/api/scrape
```
*Note: This contacts the web server which proxies the request cleanly into the worker across the secure internal docker network.*

# Tech Events Aggregator — Luma & Partiful Scraper

> **What this actor does:** Scrapes tech events from Lu.ma (lu.ma/discover) and Partiful (partiful.com/explore), auto-tags each event (hackathon, demo day, investor dinner, conference, workshop, networking), and exports Notion/Airtable-ready JSON.

## Features

- Aggregates events from **Lu.ma** and **Partiful** — the two leading platforms for tech and startup events
- **Auto-tagging**: classifies each event as hackathon, demo-day, investor-dinner, conference, workshop, networking, or other
- Filter by keyword, city, event tags, and price (free/paid)
- Output fields: name, date, location, tags, organizer, ticket price, description, image URL, source
- JSON output compatible with Notion databases, Airtable bases, Make.com, and Zapier

## Use Cases

- **Startup ecosystem mapping**: Find all hackathons and demo days in your city this month
- **Investor outreach**: Discover investor dinners and pitch events to attend or sponsor
- **Event curation**: Build tech event newsletters automatically
- **Community building**: Track conferences and networking events in your niche (AI, Web3, climate)
- **Sales prospecting**: Monitor who's running events in your target market

## Input Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `sources` | array | Platforms: `["luma", "partiful"]` | both |
| `query` | string | Keyword filter (e.g. "AI", "Web3", "climate tech") | — |
| `city` | string | City filter (e.g. "San Francisco", "London") | — |
| `tags` | array | Filter by tag: `["hackathon", "demo-day", ...]` | all tags |
| `priceType` | string | "free", "paid", or "both" | "both" |
| `maxResults` | number | Max events to return | 100 |

## Output Fields

| Field | Description |
|-------|-------------|
| `name` | Event title |
| `url` | Event URL (lu.ma or partiful.com) |
| `startAt` | ISO 8601 start datetime |
| `endDate` | ISO 8601 end datetime |
| `description` | Plain text description |
| `location` | "City, Country" string |
| `venue` | Object: address, city, country, lat, lng |
| `isOnline` | Boolean |
| `tags` | Array of auto-detected tags |
| `isFree` | Boolean |
| `ticketPrice` | Price string or "Free" |
| `organizer` | Host/organizer name |
| `imageUrl` | Event cover image |
| `source` | "luma" or "partiful" |
| `scrapedAt` | Scrape timestamp |

## Auto-Tagging Logic

Events are classified by scanning title and description:

| Tag | Trigger keywords |
|-----|-----------------|
| `hackathon` | "hackathon", "hack day", "build-a-thon" |
| `demo-day` | "demo day", "showcase", "pitch day", "demo night" |
| `investor-dinner` | "investor", "VC dinner", "funder", "venture capital" |
| `conference` | "conference", "summit", "symposium", "congress" |
| `workshop` | "workshop", "masterclass", "bootcamp", "hands-on" |
| `networking` | "networking", "happy hour", "mixer", "meetup", "social" |
| `other` | (default if no pattern matches) |

Events can have multiple tags.

## Example Input

```json
{
  "sources": ["luma", "partiful"],
  "query": "AI startup",
  "city": "San Francisco",
  "tags": ["hackathon", "demo-day", "networking"],
  "priceType": "both",
  "maxResults": 50
}
```

## Example Output

```json
{
  "name": "SF AI Founders Hackathon",
  "url": "https://lu.ma/sf-ai-hackathon-2026",
  "startAt": "2026-05-10T09:00:00.000Z",
  "location": "San Francisco, US",
  "tags": ["hackathon", "networking"],
  "isFree": true,
  "ticketPrice": "Free",
  "organizer": "AI SF Community",
  "source": "luma",
  "scrapedAt": "2026-04-23T10:00:00.000Z"
}
```

## Questions answered by this actor

- What hackathons are coming up in San Francisco this month?
- Where are the AI networking events in New York?
- Which demo days and pitch events are happening in London?
- What free tech workshops are available in my city?
- Who's organizing the most investor dinners in the Bay Area?

## Frequently Asked Questions

**Does this require any API keys?** No. Events are scraped from public pages on lu.ma and partiful.com.

**How often should I run this?** Luma and Partiful refresh their discover pages frequently. Running daily or every few days keeps your dataset current.

**Can I filter to only free events?** Yes — set `priceType: "free"`.

**Can I get events from only one source?** Yes — set `sources: ["luma"]` or `sources: ["partiful"]`.

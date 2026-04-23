import { chromium } from 'playwright';
import type { EventItem, VenueInfo, InputSchema, EventTag } from '../types';
import { parseDate, stripHtml, buildLocation } from '../utils/normalize';
import { detectTags } from '../tagger';

interface LumaGeoAddress {
  city?: string;
  country?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
}

interface LumaHost {
  name: string;
  title?: string;
  affiliation?: string;
}

interface LumaEvent {
  api_id: string;
  name: string;
  url: string;
  start_at: string;
  end_at?: string;
  description?: string;
  cover_url?: string;
  location_type?: string;
  geo_address_info?: LumaGeoAddress | null;
  ticket_info?: { is_free?: boolean; price?: number; currency?: string } | null;
  hosts?: LumaHost[];
}

interface LumaResponse {
  entries?: { event: LumaEvent }[];
}

export class LumaScraper {
  private input: InputSchema;

  constructor(input: InputSchema) {
    this.input = input;
  }

  async scrape(): Promise<EventItem[]> {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      const params = new URLSearchParams();
      if (this.input.query) params.set('query', this.input.query);
      if (this.input.city) params.set('location', this.input.city);

      let data: LumaResponse | null = null;

      page.on('response', async (response) => {
        const url = response.url();
        if (!url.includes('/api/') || response.request().method() !== 'GET') return;
        try {
          const json = await response.json() as LumaResponse;
          if (json && Array.isArray(json.entries) && json.entries.length > 0 && data === null) {
            console.log(`[luma] captured API response from: ${url}`);
            data = json;
          }
        } catch {
          // not JSON or wrong shape
        }
      });

      await new Promise(r => setTimeout(r, 500 + Math.random() * 1500));
      const targetUrl = `https://lu.ma/discover?${params.toString()}`;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(`[luma] page title: "${await page.title()}"`);
      await page.waitForTimeout(6000);

      if (!data) {
        const nextData = await page.evaluate((): unknown => {
          const el = document.getElementById('__NEXT_DATA__');
          if (!el?.textContent) return null;
          try { return JSON.parse(el.textContent); } catch { return null; }
        });
        console.log(`[luma] __NEXT_DATA__ fallback`);
        data = this.extractFromNextData(nextData);
      }

      return data ? this.normalizeResponse(data) : [];
    } finally {
      await browser.close();
    }
  }

  private extractFromNextData(raw: unknown): LumaResponse | null {
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    const pageProps = (obj['props'] as Record<string, unknown>)?.['pageProps'] as Record<string, unknown> | undefined;
    if (!pageProps) return null;
    const initialData = pageProps['initialData'] as Record<string, unknown> | undefined;
    if (!initialData) return null;
    const featuredPlace = initialData['featured_place'] as Record<string, unknown> | undefined;
    const rawEntries = featuredPlace?.['events'];
    if (!Array.isArray(rawEntries) || rawEntries.length === 0) return null;

    const entries = (rawEntries as Record<string, unknown>[])
      .map((entry) => {
        const ev = entry['event'] as LumaEvent | undefined;
        if (!ev?.name) return null;
        return {
          event: {
            ...ev,
            hosts: (entry['hosts'] as LumaHost[] | undefined) ?? ev.hosts,
            ticket_info: (entry['ticket_info'] as LumaEvent['ticket_info'] | undefined) ?? ev.ticket_info,
            url: ev.url?.startsWith('http') ? ev.url : `https://lu.ma/${ev.url}`,
          } as LumaEvent,
        };
      })
      .filter((e): e is { event: LumaEvent } => e !== null);

    console.log(`[luma] extracted ${entries.length} events from __NEXT_DATA__`);
    return entries.length > 0 ? { entries } : null;
  }

  normalizeResponse(data: LumaResponse): EventItem[] {
    const now = new Date().toISOString();
    return (data.entries ?? [])
      .slice(0, this.input.maxResults)
      .map(({ event: ev }) => {
        const geo = ev.geo_address_info;
        const isOnline = ev.location_type === 'online';
        const venue: VenueInfo | undefined = geo
          ? { address: geo.full_address, city: geo.city, country: geo.country, lat: geo.latitude, lng: geo.longitude }
          : undefined;
        const isFree = ev.ticket_info?.is_free ?? true;
        const priceRaw = ev.ticket_info?.price;
        const currency = ev.ticket_info?.currency ?? 'USD';
        const priceFormatted = priceRaw != null
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(priceRaw / 100)
          : undefined;
        const desc = stripHtml(ev.description ?? '');
        const tags: EventTag[] = detectTags(ev.name, desc);

        return {
          name: ev.name,
          url: ev.url,
          startAt: parseDate(ev.start_at),
          endDate: ev.end_at ? parseDate(ev.end_at) : undefined,
          description: desc,
          location: buildLocation(geo?.city, geo?.country),
          venue,
          isOnline,
          tags,
          isFree,
          ticketPrice: isFree ? 'Free' : priceFormatted,
          imageUrl: ev.cover_url,
          organizer: (ev.hosts ?? [])[0]?.name,
          source: 'luma' as const,
          scrapedAt: now,
        };
      });
  }
}

import { chromium } from 'playwright';
import type { EventItem, VenueInfo, InputSchema, EventTag } from '../types';
import { parseDate, stripHtml, buildLocation } from '../utils/normalize';
import { detectTags } from '../tagger';

interface PartifulMapsInfo {
  name?: string;
  addressLines?: string[];
}

interface PartifulLocationInfo {
  type?: string;
  displayName?: string;
  displayAddressLines?: string[];
  mapsInfo?: PartifulMapsInfo;
}

interface PartifulEventRaw {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  hostName?: string;
  image?: string;
  isPublic?: boolean;
  status?: string;
  locationInfo?: PartifulLocationInfo;
}

interface PartifulSectionItem {
  id: string;
  type: string;
  event?: PartifulEventRaw;
}

interface PartifulSection {
  id: string;
  title: string;
  items: PartifulSectionItem[];
}

interface PartifulNextData {
  props?: {
    pageProps?: {
      trendingSections?: Record<string, PartifulSection>;
      events?: PartifulEventRaw[];
    };
  };
}

export class PartifulScraper {
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

      await new Promise(r => setTimeout(r, 500 + Math.random() * 1500));
      await page.goto('https://partiful.com/explore', { waitUntil: 'domcontentloaded', timeout: 30000 });

      const nextData = await page.evaluate((): unknown => {
        const el = document.getElementById('__NEXT_DATA__');
        if (!el?.textContent) return null;
        try { return JSON.parse(el.textContent); } catch { return null; }
      });

      const sectionKeys = (nextData as PartifulNextData)?.props?.pageProps?.trendingSections
        ? Object.keys((nextData as PartifulNextData).props!.pageProps!.trendingSections!)
        : [];
      console.log(`[partiful] __NEXT_DATA__ found=${!!nextData} sectionKeys=${JSON.stringify(sectionKeys)}`);

      if (!nextData) return [];
      return this.extractFromNextData(nextData as PartifulNextData);
    } finally {
      await browser.close();
    }
  }

  extractFromNextData(data: PartifulNextData): EventItem[] {
    const pageProps = data?.props?.pageProps;
    if (!pageProps) return [];

    const rawEvents: PartifulEventRaw[] = [];

    const sections = pageProps.trendingSections;
    if (sections && typeof sections === 'object') {
      for (const section of Object.values(sections)) {
        if (!section?.items) continue;
        for (const item of section.items) {
          if (item?.event?.id) rawEvents.push(item.event);
        }
      }
    }

    if (Array.isArray(pageProps.events)) {
      rawEvents.push(...pageProps.events);
    }

    const seen = new Set<string>();
    const unique = rawEvents.filter((ev) => {
      if (!ev.id || seen.has(ev.id)) return false;
      seen.add(ev.id);
      return true;
    });

    const query = this.input.query?.toLowerCase();
    const now = new Date().toISOString();

    return unique
      .filter((ev) => ev.isPublic !== false && ev.status !== 'CANCELLED')
      .filter((ev) => {
        if (!query) return true;
        const text = `${ev.title} ${ev.description ?? ''}`.toLowerCase();
        return text.includes(query);
      })
      .slice(0, this.input.maxResults)
      .map((ev) => this.normalizeEvent(ev, now));
  }

  private normalizeEvent(ev: PartifulEventRaw, scrapedAt: string): EventItem {
    const loc = ev.locationInfo;
    const isOnline = loc?.type === 'online';
    const address = loc?.displayAddressLines?.join(', ') || loc?.displayName;
    const venue: VenueInfo | undefined = address
      ? { name: loc?.displayName, address }
      : undefined;

    const desc = stripHtml(ev.description ?? '');
    const tags: EventTag[] = detectTags(ev.title, desc);

    return {
      url: `https://partiful.com/e/${ev.id}`,
      name: ev.title,
      startAt: parseDate(ev.startDate),
      endDate: ev.endDate ? parseDate(ev.endDate) : undefined,
      description: desc,
      location: address ?? buildLocation(undefined, undefined),
      venue,
      isOnline,
      tags,
      isFree: false,
      ticketPrice: undefined,
      imageUrl: ev.image,
      organizer: ev.hostName,
      source: 'partiful' as const,
      scrapedAt,
    };
  }
}

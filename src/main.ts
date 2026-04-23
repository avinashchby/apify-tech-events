import { Actor } from 'apify';
import type { InputSchema, EventItem, SourceId, EventTag } from './types';
import { LumaScraper } from './scrapers/luma';
import { PartifulScraper } from './scrapers/partiful';

const DEFAULT_SOURCES: SourceId[] = ['luma', 'partiful'];

async function main(): Promise<void> {
  await Actor.init();
  try {
    const rawInput = await Actor.getInput<Partial<InputSchema>>();
    const input: InputSchema = {
      sources: rawInput?.sources ?? DEFAULT_SOURCES,
      query: rawInput?.query,
      city: rawInput?.city,
      tags: rawInput?.tags,
      priceType: rawInput?.priceType ?? 'both',
      maxResults: rawInput?.maxResults ?? 100,
    };

    console.log(`[tech-events] Starting: sources=${input.sources.join(',')} query="${input.query}" city="${input.city}"`);

    const scraperMap: Record<SourceId, () => Promise<EventItem[]>> = {
      luma: () => new LumaScraper(input).scrape(),
      partiful: () => new PartifulScraper(input).scrape(),
    };

    const allEvents: EventItem[] = [];

    // Sequential execution to avoid OOM
    for (const source of input.sources) {
      try {
        const events = await scraperMap[source]();
        console.log(`[${source}] fetched ${events.length} events`);
        allEvents.push(...events);
      } catch (err) {
        console.error(`[${source}] failed:`, err);
      }
    }

    let filtered = allEvents;
    if (input.priceType === 'free') filtered = filtered.filter(e => e.isFree);
    if (input.priceType === 'paid') filtered = filtered.filter(e => !e.isFree);
    if (input.tags && input.tags.length > 0) {
      filtered = filtered.filter(e => e.tags.some(t => (input.tags as EventTag[]).includes(t)));
    }
    filtered = filtered.slice(0, input.maxResults);

    console.log(`[tech-events] Done. Total after filters: ${filtered.length}`);
    if (filtered.length === 0) {
      console.warn('[tech-events] No events matched filters.');
    }

    const dataset = await Actor.openDataset();
    await dataset.pushData(filtered);

    await Actor.exit();
  } catch (err) {
    console.error('[tech-events] Fatal error:', err);
    await Actor.exit({ exitCode: 1 });
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

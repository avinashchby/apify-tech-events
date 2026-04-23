import type { EventTag } from './types';

const PATTERNS: Array<{ tag: EventTag; patterns: RegExp[] }> = [
  {
    tag: 'hackathon',
    patterns: [/\bhackathon\b/i, /\bhack\s*day\b/i, /\bbuild[- ]?a[- ]?thon\b/i],
  },
  {
    tag: 'demo-day',
    patterns: [/\bdemo\s*day\b/i, /\bshowcase\b/i, /\bpitch\s*day\b/i, /\bdemo\s*night\b/i],
  },
  {
    tag: 'investor-dinner',
    patterns: [/\binvestor\b/i, /\bvc\s+dinner\b/i, /\bfunder\b/i, /\bpitch\s+dinner\b/i, /\bventure\s+capital\b/i],
  },
  {
    tag: 'conference',
    patterns: [/\bconference\b/i, /\bconf\b/i, /\bsummit\b/i, /\bsymposium\b/i, /\bcongress\b/i],
  },
  {
    tag: 'workshop',
    patterns: [/\bworkshop\b/i, /\bmasterclass\b/i, /\bbootcamp\b/i, /\btraining\b/i, /\bhands[- ]?on\b/i],
  },
  {
    tag: 'networking',
    patterns: [/\bnetworking\b/i, /\bhappy\s*hour\b/i, /\bmixer\b/i, /\bsocial\b/i, /\bmeet\s*&?\s*greet\b/i, /\bmeetup\b/i],
  },
];

export function detectTags(title: string, description: string): EventTag[] {
  const text = `${title} ${description}`;
  const tags: EventTag[] = [];

  for (const { tag, patterns } of PATTERNS) {
    if (patterns.some(p => p.test(text))) {
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ['other'];
}

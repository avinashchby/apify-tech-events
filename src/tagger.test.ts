import { describe, it, expect } from 'vitest';
import { detectTags } from './tagger';

describe('detectTags', () => {
  it('detects hackathon', () => {
    expect(detectTags('Weekend Hackathon 2026', '')).toContain('hackathon');
  });

  it('detects demo-day', () => {
    expect(detectTags('Y Combinator Demo Day', '')).toContain('demo-day');
  });

  it('detects investor-dinner', () => {
    expect(detectTags('Investor Dinner SF', 'Meet top VCs')).toContain('investor-dinner');
  });

  it('detects conference', () => {
    expect(detectTags('AI Summit 2026', '')).toContain('conference');
  });

  it('detects workshop', () => {
    expect(detectTags('Hands-on LLM Workshop', '')).toContain('workshop');
  });

  it('detects networking', () => {
    expect(detectTags('Tech Networking Happy Hour', '')).toContain('networking');
  });

  it('returns other for unclassified events', () => {
    expect(detectTags('Random Party Night', 'Just hanging out')).toEqual(['other']);
  });

  it('can return multiple tags', () => {
    const tags = detectTags('Hackathon & Networking Night', '');
    expect(tags).toContain('hackathon');
    expect(tags).toContain('networking');
  });
});

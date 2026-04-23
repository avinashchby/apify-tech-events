export type SourceId = 'luma' | 'partiful';
export type EventTag = 'hackathon' | 'demo-day' | 'investor-dinner' | 'conference' | 'workshop' | 'networking' | 'other';

export interface InputSchema {
  sources: SourceId[];
  query?: string;
  city?: string;
  tags?: EventTag[];
  priceType?: 'free' | 'paid' | 'both';
  maxResults: number;
}

export interface VenueInfo {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface EventItem {
  name: string;
  url: string;
  startAt: string;
  endDate?: string;
  description: string;
  location: string;
  venue?: VenueInfo;
  isOnline: boolean;
  tags: EventTag[];
  isFree: boolean;
  ticketPrice?: string;
  imageUrl?: string;
  organizer?: string;
  source: SourceId;
  scrapedAt: string;
}

export interface DiscogsRelease {
  id: number;
  title: string;
  year?: string | number;
  thumb?: string;
  cover_image?: string;
  resource_url?: string;
  type?: 'release' | 'master';
  artist?: string; // Main artist name for display
  artists?: { name: string }[];
  labels?: { name: string }[];
  styles?: string[];
  genres?: string[];
  tracklist?: DiscogsTrack[];
  country?: string;
  format?: string[];
}

export interface DiscogsTrack {
  position: string;
  title: string;
  duration?: string;
  type_: string; // 'track'
  artists?: { name: string }[]; // Track specific artists
}

export interface Mp3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string | string[];
  trackNumber?: number;
  discNumber?: string; // TPOS is often "1/2" or just "1"
  albumArtist?: string;
  label?: string;
  bpm?: number;
  composer?: string;
  image?: Blob;
  duration?: number;
  comment?: string;
}

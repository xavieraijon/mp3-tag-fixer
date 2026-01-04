import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @IsOptional() // Permite string vacíos si el frontend envía "" como artista
  artist: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  filename?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence?: number;
}

export class MatchResult {
  id: string | number;
  title: string;
  artist?: string;
  year?: number;
  score: number;
  source: 'discogs' | 'musicbrainz';
  cover_image?: string;
  label?: string;
  type?: string;
  tracklist?: any[];
  matchDetails?: any;
}

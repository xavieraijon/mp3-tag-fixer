import { IsString, IsOptional } from 'class-validator';

export class ParseFilenameDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  existingArtist?: string;

  @IsOptional()
  @IsString()
  existingTitle?: string;
}

export interface ParseFilenameResponse {
  artist: string;
  title: string;
  confidence: number;
  source: 'groq' | 'fallback';
  reasoning?: string;
}

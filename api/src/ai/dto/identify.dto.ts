import { IsString, IsOptional } from 'class-validator';

export class IdentifyResponseDto {
  source: 'acoustid';
  confidence: number;
  artist: string;
  title: string;
  album?: string;
  musicbrainzId?: string;
  acoustidId?: string;
}

export class IdentifyStatusDto {
  available: boolean;
  provider: string;
}

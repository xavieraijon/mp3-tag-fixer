import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TrackCandidateDto {
  @IsString()
  position: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsArray()
  artists?: any[]; // Simplified for flexibility
}

export class RankTracksDto {
  @IsString()
  artist: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsNumber()
  duration?: number; // Duration in seconds

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackCandidateDto)
  tracks: TrackCandidateDto[];
}

export class RankedTrackDto extends TrackCandidateDto {
  score: number;
  matchDetails?: {
    titleScore: number;
    versionScore: number;
    durationScore: number;
  };
}

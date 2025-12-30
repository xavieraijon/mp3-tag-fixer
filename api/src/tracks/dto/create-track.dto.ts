import { IsString, IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { TrackStatus } from '@prisma/client';

export class CreateTrackDto {
  @IsString()
  originalFilename: string;

  @IsOptional()
  @IsString()
  fileHash?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  album?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  bpm?: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  trackNumber?: number;

  @IsOptional()
  @IsString()
  albumArtist?: string;

  @IsOptional()
  @IsString()
  composer?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsInt()
  discogsReleaseId?: number;

  @IsOptional()
  @IsString()
  discogsTrackPos?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  searchQuery?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  searchScore?: number;

  @IsOptional()
  @IsEnum(TrackStatus)
  status?: TrackStatus;
}

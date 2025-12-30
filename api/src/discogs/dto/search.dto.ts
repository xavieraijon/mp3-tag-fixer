import { IsString, IsOptional, IsIn } from 'class-validator';

export class SearchReleaseDto {
  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  release?: string;

  @IsOptional()
  @IsIn(['release', 'master', 'all'])
  type?: 'release' | 'master' | 'all';
}

export class SearchTrackDto {
  @IsOptional()
  @IsString()
  artist?: string;

  @IsString()
  track: string;

  @IsOptional()
  @IsIn(['release', 'master', 'all'])
  type?: 'release' | 'master' | 'all';
}

export class SearchQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsIn(['release', 'master', 'all'])
  type?: 'release' | 'master' | 'all';
}

export class SmartSearchDto {
  @IsString()
  artist: string;

  @IsString()
  title: string;
}

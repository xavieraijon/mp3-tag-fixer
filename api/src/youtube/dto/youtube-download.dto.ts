import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class YoutubeDownloadDto {
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/,
    { message: 'Invalid YouTube URL format' },
  )
  url: string;
}

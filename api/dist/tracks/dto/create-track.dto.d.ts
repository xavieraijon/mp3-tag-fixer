import { TrackStatus } from '@prisma/client';
export declare class CreateTrackDto {
    originalFilename: string;
    fileHash?: string;
    title?: string;
    artist?: string;
    album?: string;
    year?: number;
    genre?: string;
    bpm?: number;
    label?: string;
    trackNumber?: number;
    albumArtist?: string;
    composer?: string;
    comment?: string;
    discogsReleaseId?: number;
    discogsTrackPos?: string;
    coverImageUrl?: string;
    searchQuery?: string;
    searchScore?: number;
    status?: TrackStatus;
}

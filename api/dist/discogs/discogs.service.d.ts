import { ConfigService } from '@nestjs/config';
export interface DiscogsRelease {
    id: number;
    title: string;
    type?: 'release' | 'master';
    year?: number;
    thumb?: string;
    cover_image?: string;
    country?: string;
    format?: string[];
    labels?: {
        name: string;
    }[];
    genres?: string[];
    styles?: string[];
    artist?: string;
    artists?: {
        name: string;
    }[];
    tracklist?: DiscogsTrack[];
    main_release?: number;
}
export interface DiscogsTrack {
    position: string;
    title: string;
    duration?: string;
    artists?: {
        name: string;
    }[];
    type_: string;
}
export declare class DiscogsService {
    private configService;
    private readonly API_URL;
    private readonly consumerKey;
    private readonly consumerSecret;
    constructor(configService: ConfigService);
    private getHeaders;
    private parseSearchResult;
    searchRelease(artist: string, release: string, type?: 'release' | 'master' | 'all'): Promise<DiscogsRelease[]>;
    searchByTrack(artist: string, track: string, type?: 'release' | 'master' | 'all'): Promise<DiscogsRelease[]>;
    searchQuery(query: string, type?: 'release' | 'master' | 'all'): Promise<DiscogsRelease[]>;
    getReleaseDetails(id: number, type?: 'release' | 'master'): Promise<DiscogsRelease | null>;
    private mapToDiscogsRelease;
    fetchCoverImage(imageUrl: string): Promise<Buffer | null>;
}

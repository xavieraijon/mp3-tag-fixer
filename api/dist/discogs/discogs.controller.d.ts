import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { DiscogsService } from './discogs.service';
import { SearchService } from './search.service';
import { SearchReleaseDto, SearchTrackDto, SearchQueryDto, SmartSearchDto } from './dto/search.dto';
export declare class DiscogsController {
    private readonly discogsService;
    private readonly searchService;
    constructor(discogsService: DiscogsService, searchService: SearchService);
    smartSearch(dto: SmartSearchDto): Promise<{
        results: import("./search.service").SearchResult[];
        count: number;
    }>;
    searchRelease(dto: SearchReleaseDto): Promise<{
        results: import("./discogs.service").DiscogsRelease[];
        count: number;
    }>;
    searchByTrack(dto: SearchTrackDto): Promise<{
        results: import("./discogs.service").DiscogsRelease[];
        count: number;
    }>;
    searchQuery(dto: SearchQueryDto): Promise<{
        results: import("./discogs.service").DiscogsRelease[];
        count: number;
    }>;
    getReleaseDetails(id: string, type?: 'release' | 'master'): Promise<import("./discogs.service").DiscogsRelease>;
    getMasterDetails(id: string): Promise<import("./discogs.service").DiscogsRelease>;
    getCoverImage(imageUrl: string, res: Response): Promise<StreamableFile>;
}

import { StringUtilsService } from '../shared/string-utils';
import { SearchStrategy } from '../shared/interfaces';
import { DiscogsService, DiscogsRelease } from './discogs.service';
export interface SearchResult extends DiscogsRelease {
    _score?: number;
}
export declare class SearchService {
    private readonly stringUtils;
    private readonly discogs;
    private readonly API_DELAY;
    private readonly EXCELLENT_SCORE;
    private readonly GOOD_SCORE;
    private readonly MIN_RESULTS_FOR_GOOD;
    constructor(stringUtils: StringUtilsService, discogs: DiscogsService);
    generateStrategies(artist: string, title: string): SearchStrategy[];
    executeStrategy(strategy: SearchStrategy): Promise<DiscogsRelease[]>;
    calculateResultScore(result: DiscogsRelease, searchArtist: string, searchTitle: string): number;
    search(artist: string, title: string, onProgress?: (message: string) => void): Promise<SearchResult[]>;
    private delay;
}

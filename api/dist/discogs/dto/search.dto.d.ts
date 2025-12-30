export declare class SearchReleaseDto {
    artist?: string;
    release?: string;
    type?: 'release' | 'master' | 'all';
}
export declare class SearchTrackDto {
    artist?: string;
    track: string;
    type?: 'release' | 'master' | 'all';
}
export declare class SearchQueryDto {
    q: string;
    type?: 'release' | 'master' | 'all';
}
export declare class SmartSearchDto {
    artist: string;
    title: string;
}

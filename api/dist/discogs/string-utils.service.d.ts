export declare class StringUtilsService {
    normalizeSuperscripts(str: string): string;
    normalizeArtistName(artist: string): string[];
    normalizeArtistForComparison(str: string): string;
    normalizeForComparison(str: string): string;
    normalizeTitleForMatching(str: string): string;
    extractParenthesisInfo(title: string): {
        base: string;
        mixInfo: string;
        full: string;
    };
    normalizeTitleForSearch(title: string): string[];
    calculateStringSimilarity(str1: string, str2: string): number;
    looksLikeFilename(tag: string): boolean;
    isValidTag(tag: string | undefined): boolean;
}

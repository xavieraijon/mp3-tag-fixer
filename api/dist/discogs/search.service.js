"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const string_utils_service_1 = require("./string-utils.service");
const discogs_service_1 = require("./discogs.service");
let SearchService = class SearchService {
    stringUtils;
    discogs;
    API_DELAY = 1200;
    EXCELLENT_SCORE = 70;
    GOOD_SCORE = 50;
    MIN_RESULTS_FOR_GOOD = 3;
    constructor(stringUtils, discogs) {
        this.stringUtils = stringUtils;
        this.discogs = discogs;
    }
    generateStrategies(artist, title) {
        const strategies = [];
        let priority = 0;
        if (artist && title) {
            strategies.push({
                type: 'query',
                artist: '',
                title: `${artist} - ${title}`,
                searchType: 'all',
                description: `Direct: "${artist} - ${title}"`,
                priority: priority++,
            });
            strategies.push({
                type: 'query',
                artist: '',
                title: `${artist} ${title}`,
                searchType: 'all',
                description: `Direct: "${artist} ${title}"`,
                priority: priority++,
            });
            strategies.push({
                type: 'track',
                artist: artist,
                title: title,
                searchType: 'all',
                description: `Track exact: "${artist}" - "${title}"`,
                priority: priority++,
            });
            strategies.push({
                type: 'release',
                artist: artist,
                title: title,
                searchType: 'master',
                description: `Master exact: "${artist}" - "${title}"`,
                priority: priority++,
            });
        }
        const artistVariants = this.stringUtils.normalizeArtistName(artist);
        const titleVariants = this.stringUtils.normalizeTitleForSearch(title);
        const titleParsed = this.stringUtils.extractParenthesisInfo(title);
        if (titleParsed.base !== title && titleParsed.base.length > 2) {
            strategies.push({
                type: 'query',
                artist: '',
                title: `${artist} - ${titleParsed.base}`,
                searchType: 'all',
                description: `Direct base: "${artist} - ${titleParsed.base}"`,
                priority: priority++,
            });
            strategies.push({
                type: 'query',
                artist: '',
                title: `${artist} ${titleParsed.base}`,
                searchType: 'all',
                description: `Query base: "${artist} ${titleParsed.base}"`,
                priority: priority++,
            });
            strategies.push({
                type: 'track',
                artist: artist,
                title: titleParsed.base,
                searchType: 'all',
                description: `Track base: "${artist}" - "${titleParsed.base}"`,
                priority: priority++,
            });
            strategies.push({
                type: 'release',
                artist: artist,
                title: titleParsed.base,
                searchType: 'master',
                description: `Master base: "${artist}" - "${titleParsed.base}"`,
                priority: priority++,
            });
        }
        for (const a of artistVariants.slice(1, 4)) {
            strategies.push({
                type: 'track',
                artist: a,
                title: titleParsed.base,
                searchType: 'all',
                description: `Track: "${a}" - "${titleParsed.base}"`,
                priority: priority++,
            });
        }
        for (const a of artistVariants.slice(1, 3)) {
            for (const t of titleVariants.slice(0, 2)) {
                strategies.push({
                    type: 'release',
                    artist: a,
                    title: t,
                    searchType: 'master',
                    description: `Master: "${a}" - "${t}"`,
                    priority: priority++,
                });
            }
        }
        strategies.push({
            type: 'track',
            artist: '',
            title: titleParsed.base,
            searchType: 'all',
            description: `Track any artist: "${titleParsed.base}"`,
            priority: priority++,
        });
        strategies.push({
            type: 'query',
            artist: '',
            title: titleParsed.base,
            searchType: 'all',
            description: `Query title only: "${titleParsed.base}"`,
            priority: priority++,
        });
        for (const a of artistVariants.slice(0, 2)) {
            strategies.push({
                type: 'release',
                artist: a,
                title: '',
                searchType: 'master',
                description: `Artist only: "${a}"`,
                priority: priority++,
            });
        }
        for (const a of artistVariants.slice(0, 2)) {
            for (const t of titleVariants.slice(0, 2)) {
                strategies.push({
                    type: 'release',
                    artist: a,
                    title: t,
                    searchType: 'release',
                    description: `Release: "${a}" - "${t}"`,
                    priority: priority++,
                });
            }
        }
        if (artist && title && artist !== title) {
            strategies.push({
                type: 'track',
                artist: titleParsed.base,
                title: artist,
                searchType: 'all',
                description: `Swapped: "${titleParsed.base}" - "${artist}"`,
                priority: priority++,
            });
        }
        const seen = new Set();
        return strategies
            .sort((a, b) => a.priority - b.priority)
            .filter((s) => {
            const key = `${s.type}:${s.artist}:${s.title}:${s.searchType}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    async executeStrategy(strategy) {
        switch (strategy.type) {
            case 'track':
                return this.discogs.searchByTrack(strategy.artist, strategy.title, strategy.searchType);
            case 'query':
                return this.discogs.searchQuery(strategy.title, strategy.searchType);
            case 'release':
                return this.discogs.searchRelease(strategy.artist, strategy.title, strategy.searchType);
            default:
                return [];
        }
    }
    calculateResultScore(result, searchArtist, searchTitle) {
        let score = 0;
        const resultArtist = result.artist || '';
        const resultTitle = result.title || '';
        const normalizedResultArtist = this.stringUtils.normalizeArtistForComparison(resultArtist);
        const normalizedSearchArtist = this.stringUtils.normalizeArtistForComparison(searchArtist);
        const artistSimilarity = this.stringUtils.calculateStringSimilarity(normalizedResultArtist, normalizedSearchArtist);
        let artistScore = 0;
        if (artistSimilarity >= 0.85) {
            artistScore = 60;
        }
        else if (artistSimilarity >= 0.7) {
            artistScore = 50;
        }
        else if (artistSimilarity >= 0.5) {
            artistScore = 30;
        }
        else if (artistSimilarity >= 0.4) {
            artistScore = 15;
        }
        score += artistScore;
        const titleParsed = this.stringUtils.extractParenthesisInfo(searchTitle);
        const baseTitle = titleParsed.base.toLowerCase();
        const resultTitleLower = resultTitle.toLowerCase();
        let titleScore = 0;
        if (resultTitleLower === baseTitle) {
            titleScore = 30;
        }
        else if (resultTitleLower.includes(baseTitle)) {
            titleScore = 25;
        }
        else if (baseTitle.includes(resultTitleLower)) {
            titleScore = 20;
        }
        else {
            const searchWords = baseTitle.split(/\s+/).filter((w) => w.length > 2);
            const resultWords = resultTitleLower.split(/\s+/);
            if (searchWords.length > 0) {
                let matchedWords = 0;
                for (const sw of searchWords) {
                    if (resultWords.some((rw) => rw.includes(sw) || sw.includes(rw))) {
                        matchedWords++;
                    }
                }
                titleScore = (matchedWords / searchWords.length) * 15;
            }
        }
        if (artistSimilarity < 0.5) {
            titleScore = Math.min(titleScore, 10);
        }
        score += titleScore;
        if (result.year)
            score += 2;
        if (result.type === 'master')
            score += 2;
        if (result.thumb || result.cover_image)
            score += 1;
        const genres = [...(result.genres || []), ...(result.styles || [])].map((g) => g.toLowerCase());
        if (genres.some((g) => [
            'electronic',
            'techno',
            'house',
            'trance',
            'dance',
            'hardcore',
            'gabber',
            'makina',
        ].includes(g))) {
            score += 3;
        }
        if (artistSimilarity >= 0.7 && resultTitleLower.includes(baseTitle)) {
            score += 2;
        }
        return Math.round(score);
    }
    async search(artist, title, onProgress) {
        const strategies = this.generateStrategies(artist, title);
        console.log(`[SearchService] Generated ${strategies.length} strategies for "${artist} - ${title}"`);
        const allResults = [];
        let attemptCount = 0;
        const maxAttempts = 15;
        for (const strategy of strategies.slice(0, maxAttempts)) {
            attemptCount++;
            if (onProgress) {
                onProgress(`Search ${attemptCount}/${Math.min(strategies.length, maxAttempts)}: ${strategy.description}`);
            }
            try {
                const results = await this.executeStrategy(strategy);
                console.log(`[SearchService] Strategy "${strategy.description}" returned ${results.length} results`);
                if (results.length > 0) {
                    for (const r of results) {
                        if (!allResults.some((existing) => existing.id === r.id)) {
                            const scored = r;
                            scored._score = this.calculateResultScore(r, artist, title);
                            allResults.push(scored);
                        }
                    }
                    allResults.sort((a, b) => (b._score || 0) - (a._score || 0));
                    const topScore = allResults[0]?._score || 0;
                    if (topScore >= this.EXCELLENT_SCORE) {
                        console.log(`[SearchService] Excellent match found (score ${topScore}), stopping`);
                        break;
                    }
                    if (allResults.length >= this.MIN_RESULTS_FOR_GOOD &&
                        topScore >= this.GOOD_SCORE) {
                        console.log(`[SearchService] Found ${allResults.length} results with top score ${topScore}, stopping`);
                        break;
                    }
                }
            }
            catch (e) {
                console.warn(`[SearchService] Strategy "${strategy.description}" failed:`, e);
            }
            await this.delay(this.API_DELAY);
        }
        if (allResults.length > 0) {
            console.log(`[SearchService] Final ranking for "${artist} - ${title}":`);
            allResults.slice(0, 5).forEach((r, i) => {
                console.log(`  ${i + 1}. [Score: ${r._score}] ${r.artist} - ${r.title}`);
            });
        }
        return allResults;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [string_utils_service_1.StringUtilsService,
        discogs_service_1.DiscogsService])
], SearchService);
//# sourceMappingURL=search.service.js.map
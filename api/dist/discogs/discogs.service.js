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
exports.DiscogsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let DiscogsService = class DiscogsService {
    configService;
    API_URL = 'https://api.discogs.com';
    consumerKey;
    consumerSecret;
    constructor(configService) {
        this.configService = configService;
        this.consumerKey =
            this.configService.get('DISCOGS_CONSUMER_KEY') || '';
        this.consumerSecret =
            this.configService.get('DISCOGS_CONSUMER_SECRET') || '';
        if (!this.consumerKey || !this.consumerSecret) {
            console.warn('[DiscogsService] API credentials not configured');
        }
    }
    getHeaders() {
        return {
            Authorization: `Discogs key=${this.consumerKey}, secret=${this.consumerSecret}`,
            'User-Agent': 'MP3TagFixer/1.0',
        };
    }
    parseSearchResult(r) {
        return {
            id: r.id,
            title: r.title.includes(' - ')
                ? r.title.split(' - ').slice(1).join(' - ')
                : r.title,
            type: r.type,
            year: r.year,
            thumb: r.thumb,
            cover_image: r.cover_image,
            country: r.country,
            format: r.format,
            labels: r.label ? r.label.map((l) => ({ name: l })) : [],
            genres: r.genre || [],
            styles: r.style || [],
            artist: r.title.includes(' - ') ? r.title.split(' - ')[0] : '',
        };
    }
    async searchRelease(artist, release, type = 'master') {
        const params = new URLSearchParams({ per_page: '25' });
        if (artist)
            params.set('artist', artist);
        if (release)
            params.set('release_title', release);
        if (type !== 'all')
            params.set('type', type);
        if (!artist && !release)
            return [];
        const url = `${this.API_URL}/database/search?${params}`;
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok) {
            console.error('[DiscogsService] Search failed:', response.status);
            return [];
        }
        const data = await response.json();
        return (data.results || []).map((r) => this.parseSearchResult(r));
    }
    async searchByTrack(artist, track, type = 'all') {
        const params = new URLSearchParams({ per_page: '25' });
        if (artist)
            params.set('artist', artist);
        if (track)
            params.set('track', track);
        if (type !== 'all')
            params.set('type', type);
        if (!track)
            return [];
        const url = `${this.API_URL}/database/search?${params}`;
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok)
            return [];
        const data = await response.json();
        return (data.results || []).map((r) => this.parseSearchResult(r));
    }
    async searchQuery(query, type = 'all') {
        if (!query || query.trim().length < 2)
            return [];
        const params = new URLSearchParams({
            q: query.trim(),
            per_page: '25',
        });
        if (type !== 'all')
            params.set('type', type);
        const url = `${this.API_URL}/database/search?${params}`;
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok)
            return [];
        const data = await response.json();
        return (data.results || []).map((r) => this.parseSearchResult(r));
    }
    async getReleaseDetails(id, type = 'release') {
        const url = type === 'master'
            ? `${this.API_URL}/masters/${id}`
            : `${this.API_URL}/releases/${id}`;
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok) {
            console.warn(`[DiscogsService] Get details failed for ${type}/${id} (${response.status}). Trying fallback...`);
            if (response.status === 404 || response.status === 400) {
                const fallbackType = type === 'master' ? 'release' : 'master';
                const fallbackUrl = fallbackType === 'master'
                    ? `${this.API_URL}/masters/${id}`
                    : `${this.API_URL}/releases/${id}`;
                const fallbackResponse = await fetch(fallbackUrl, {
                    headers: this.getHeaders(),
                });
                if (fallbackResponse.ok) {
                    console.log(`[DiscogsService] Fallback successful: Found as ${fallbackType}`);
                    const details = await fallbackResponse.json();
                    return this.mapToDiscogsRelease(details);
                }
            }
            return null;
        }
        const details = await response.json();
        return this.mapToDiscogsRelease(details);
    }
    mapToDiscogsRelease(details) {
        return {
            id: details.id,
            title: details.title,
            year: details.year,
            artist: details.artists?.[0]?.name,
            artists: details.artists?.map((a) => ({ name: a.name })),
            labels: details.labels?.map((l) => ({ name: l.name })) || [],
            genres: details.genres || [],
            styles: details.styles || [],
            country: details.country,
            thumb: details.thumb,
            cover_image: details.images?.[0]?.uri || details.thumb,
            tracklist: details.tracklist?.map((t) => ({
                position: t.position,
                title: t.title,
                duration: t.duration,
                artists: t.artists?.map((a) => ({ name: a.name })),
                type_: t.type_,
            })),
            main_release: details.main_release,
        };
    }
    async fetchCoverImage(imageUrl) {
        if (!imageUrl)
            return null;
        try {
            const response = await fetch(imageUrl, {
                headers: { 'User-Agent': 'MP3TagFixer/1.0' },
            });
            if (!response.ok)
                return null;
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (e) {
            console.warn('[DiscogsService] Could not fetch cover:', e);
            return null;
        }
    }
};
exports.DiscogsService = DiscogsService;
exports.DiscogsService = DiscogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DiscogsService);
//# sourceMappingURL=discogs.service.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const music_metadata_1 = require("music-metadata");
const NodeID3 = __importStar(require("node-id3"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
let FilesService = class FilesService {
    uploadDir = path.join(process.cwd(), 'uploads');
    async readTags(buffer) {
        try {
            const metadata = await (0, music_metadata_1.parseBuffer)(buffer, {
                mimeType: 'audio/mpeg',
            });
            const { common, format } = metadata;
            return {
                title: common.title,
                artist: common.artist,
                album: common.album,
                year: common.year,
                genre: common.genre?.[0],
                trackNumber: common.track?.no ?? undefined,
                bpm: common.bpm,
                label: common.label?.[0],
                albumArtist: common.albumartist,
                composer: common.composer?.[0],
                comment: typeof common.comment?.[0] === 'string'
                    ? common.comment[0]
                    : common.comment?.[0]?.text,
                duration: format.duration ? Math.round(format.duration) : undefined,
                image: common.picture?.[0]?.data
                    ? Buffer.from(common.picture[0].data)
                    : undefined,
            };
        }
        catch (error) {
            console.error('[FilesService] Error reading tags:', error);
            throw new common_1.BadRequestException('Failed to read MP3 tags');
        }
    }
    async writeTags(buffer, tags) {
        try {
            const id3Tags = {
                title: tags.title,
                artist: tags.artist,
                album: tags.album,
                year: tags.year?.toString(),
                genre: tags.genre,
                trackNumber: tags.trackNumber?.toString(),
                bpm: tags.bpm?.toString(),
                publisher: tags.label,
                performerInfo: tags.albumArtist,
                composer: tags.composer,
                comment: tags.comment ? { language: 'eng', text: tags.comment } : undefined,
            };
            if (tags.image) {
                id3Tags.image = {
                    mime: 'image/jpeg',
                    type: { id: 3, name: 'front cover' },
                    description: 'Cover',
                    imageBuffer: tags.image,
                };
            }
            const taggedBuffer = NodeID3.write(id3Tags, buffer);
            if (!taggedBuffer) {
                throw new Error('Failed to write tags');
            }
            return taggedBuffer;
        }
        catch (error) {
            console.error('[FilesService] Error writing tags:', error);
            throw new common_1.BadRequestException('Failed to write MP3 tags');
        }
    }
    parseFilename(filename) {
        let name = filename.replace(/\.[^/.]+$/, '');
        name = name
            .replace(/^[A-Z]?\d+[\s._-]+/i, '')
            .replace(/^\d+[\s._-]+/, '')
            .replace(/\s*\[.*?\]\s*/g, '')
            .replace(/\s*\((?:320|128|192|256|vbr|mp3|flac|wav)\s*(?:kbps?)?\)\s*/gi, '')
            .trim();
        const separators = [' - ', ' – ', ' — ', '_-_', ' _ '];
        for (const sep of separators) {
            if (name.includes(sep)) {
                const parts = name.split(sep);
                if (parts.length >= 2) {
                    return {
                        artist: parts[0].trim(),
                        title: parts.slice(1).join(sep).trim(),
                    };
                }
            }
        }
        return {
            artist: '',
            title: name.trim(),
        };
    }
    async saveTemp(file) {
        const filename = `${Date.now()}-${file.originalname}`;
        const filepath = path.join(this.uploadDir, filename);
        await fs.mkdir(this.uploadDir, { recursive: true });
        await fs.writeFile(filepath, file.buffer);
        return filepath;
    }
    async readFile(filepath) {
        return fs.readFile(filepath);
    }
    async deleteTemp(filepath) {
        try {
            await fs.unlink(filepath);
        }
        catch (error) {
            console.warn('[FilesService] Failed to delete temp file:', filepath);
        }
    }
    sanitizeFilename(artist, title) {
        const name = artist ? `${artist} - ${title}` : title;
        return name
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200);
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = __decorate([
    (0, common_1.Injectable)()
], FilesService);
//# sourceMappingURL=files.service.js.map
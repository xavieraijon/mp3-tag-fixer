"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringUtilsService = void 0;
const common_1 = require("@nestjs/common");
let StringUtilsService = class StringUtilsService {
    normalizeSuperscripts(str) {
        return str
            .replace(/¹/g, '1')
            .replace(/²/g, '2')
            .replace(/³/g, '3')
            .replace(/⁴/g, '4')
            .replace(/⁵/g, '5')
            .replace(/⁶/g, '6')
            .replace(/⁷/g, '7')
            .replace(/⁸/g, '8')
            .replace(/⁹/g, '9')
            .replace(/⁰/g, '0');
    }
    normalizeArtistName(artist) {
        if (!artist)
            return [];
        const variants = [artist];
        let normalized = artist.trim();
        const withNormalNumbers = this.normalizeSuperscripts(normalized);
        if (withNormalNumbers !== normalized) {
            variants.push(withNormalNumbers);
            normalized = withNormalNumbers;
        }
        normalized = normalized.replace(/^dj\s+/i, 'DJ ');
        if (normalized !== artist)
            variants.push(normalized);
        const withoutDj = normalized.replace(/^DJ\s+/i, '');
        if (withoutDj !== normalized)
            variants.push(withoutDj);
        const noHyphens = normalized.replace(/-/g, '');
        if (noHyphens !== normalized)
            variants.push(noHyphens);
        const hyphenToSpace = normalized.replace(/-/g, ' ');
        if (hyphenToSpace !== normalized)
            variants.push(hyphenToSpace);
        const noNumbers = normalized.replace(/\s*\d+\s*$/, '').trim();
        if (noNumbers !== normalized && noNumbers.length > 2)
            variants.push(noNumbers);
        const noDots = normalized.replace(/\./g, '');
        if (noDots !== normalized)
            variants.push(noDots);
        const words = normalized.split(/\s+/);
        if (words.length === 1 &&
            normalized.length >= 3 &&
            normalized.length <= 8) {
            const withDots = normalized.split('').join('.') + '.';
            variants.push(withDots);
            variants.push(withDots.toUpperCase());
        }
        const upperNoDots = normalized.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (upperNoDots !== normalized.toUpperCase())
            variants.push(upperNoDots);
        const clean = normalized
            .replace(/[^\w\s\-'&]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (clean !== normalized)
            variants.push(clean);
        return [...new Set(variants)].filter((v) => v.length > 0);
    }
    normalizeArtistForComparison(str) {
        return str
            .toLowerCase()
            .replace(/^(dj|mc|dr|mr|ms|the)\s+/i, '')
            .replace(/[.\-_'*]/g, '')
            .replace(/\s+/g, '')
            .replace(/(\d+)$/, '')
            .trim();
    }
    normalizeForComparison(str) {
        if (!str)
            return '';
        return str
            .toLowerCase()
            .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, '')
            .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    normalizeTitleForMatching(str) {
        return str
            .toLowerCase()
            .replace(/[.'!?,;:\-_'"]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    extractParenthesisInfo(title) {
        const match = title.match(/^(.+?)\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
        if (match) {
            return {
                base: match[1].trim(),
                mixInfo: match[2].trim(),
                full: title,
            };
        }
        return { base: title, mixInfo: '', full: title };
    }
    normalizeTitleForSearch(title) {
        if (!title)
            return [];
        const variants = [title];
        const parsed = this.extractParenthesisInfo(title);
        if (parsed.base !== title) {
            variants.push(parsed.base);
        }
        if (parsed.mixInfo && parsed.mixInfo.length > 3) {
            variants.push(`${parsed.base} ${parsed.mixInfo}`);
        }
        let cleaned = title
            .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, ' ')
            .replace(/\s*-\s*(original mix|radio edit|extended mix|club mix|dub mix|remix|instrumental).*$/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleaned !== title && cleaned.length > 2) {
            variants.push(cleaned);
        }
        cleaned = title.replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '').trim();
        if (cleaned !== title)
            variants.push(cleaned);
        return [...new Set(variants)].filter((v) => v.length > 0);
    }
    calculateStringSimilarity(str1, str2) {
        if (!str1 || !str2)
            return 0;
        if (str1 === str2)
            return 1;
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        if (s1 === s2)
            return 1;
        if (s1.includes(s2))
            return s2.length / s1.length;
        if (s2.includes(s1))
            return s1.length / s2.length;
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0)
            return 1;
        const costs = [];
        for (let i = 0; i <= shorter.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= longer.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                }
                else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0)
                costs[longer.length] = lastValue;
        }
        return (longer.length - costs[longer.length]) / longer.length;
    }
    looksLikeFilename(tag) {
        if (tag.length > 80)
            return true;
        if (/\d{5,}/.test(tag))
            return true;
        if (/[-_]\d{4}[-_]\d+[-_]\d+/.test(tag))
            return true;
        if (/[-_]\d{4,}$/.test(tag))
            return true;
        if (/^\d{1,2}\s+-\s+/.test(tag))
            return true;
        if (/^\d{1,2}-[A-Za-z]/.test(tag))
            return true;
        if (/^[\(\[]?[A-D][1-9²³¹][\)\]]?\s/i.test(tag))
            return true;
        if (/_/.test(tag) && tag.length > 25)
            return true;
        if ((tag.match(/ - /g) || []).length >= 2)
            return true;
        if (/[-_]\d{1,2}\.\d{2}[-_]\d{2,3}/.test(tag))
            return true;
        if (/^[A-Za-z].*-[A-Za-z].*-\d/.test(tag))
            return true;
        return false;
    }
    isValidTag(tag) {
        if (!tag || tag.trim().length < 2)
            return false;
        return !this.looksLikeFilename(tag);
    }
};
exports.StringUtilsService = StringUtilsService;
exports.StringUtilsService = StringUtilsService = __decorate([
    (0, common_1.Injectable)()
], StringUtilsService);
//# sourceMappingURL=string-utils.service.js.map
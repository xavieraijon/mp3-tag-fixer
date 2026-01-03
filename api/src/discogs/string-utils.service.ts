import { Injectable } from '@nestjs/common';

/**
 * Service for string normalization and comparison utilities.
 * Used for artist names, track titles, and filename parsing.
 */
@Injectable()
export class StringUtilsService {
  /**
   * Converts superscript characters to normal numbers.
   * Example: "HS²" → "HS2"
   */
  normalizeSuperscripts(str: string): string {
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

  /**
   * Generates multiple search variants for an artist name.
   * Handles DJ prefixes, hyphens, dots, etc.
   */
  normalizeArtistName(artist: string): string[] {
    if (!artist) return [];

    const variants: string[] = [artist];
    let normalized = artist.trim();

    // Normalize superscripts: HS² → HS2
    const withNormalNumbers = this.normalizeSuperscripts(normalized);
    if (withNormalNumbers !== normalized) {
      variants.push(withNormalNumbers);
      normalized = withNormalNumbers;
    }

    // DJ/Dj -> DJ
    normalized = normalized.replace(/^dj\s+/i, 'DJ ');
    if (normalized !== artist) variants.push(normalized);

    // Remove "DJ " prefix
    const withoutDj = normalized.replace(/^DJ\s+/i, '');
    if (withoutDj !== normalized) variants.push(withoutDj);

    // Remove hyphens in names: K-rrion -> Karrion
    const noHyphens = normalized.replace(/-/g, '');
    if (noHyphens !== normalized) variants.push(noHyphens);

    // Also try with space instead of hyphen: K-rrion -> K rrion
    const hyphenToSpace = normalized.replace(/-/g, ' ');
    if (hyphenToSpace !== normalized) variants.push(hyphenToSpace);

    // Remove numbers at end: Brain 6 -> Brain
    const noNumbers = normalized.replace(/\s*\d+\s*$/, '').trim();
    if (noNumbers !== normalized && noNumbers.length > 2)
      variants.push(noNumbers);

    // Clean special chars (remove dots, etc): L.I.N.D.A. -> LINDA
    const noDots = normalized.replace(/\./g, '');
    if (noDots !== normalized) variants.push(noDots);

    // Try adding dots between letters for short names (Linda -> L.I.N.D.A.)
    const words = normalized.split(/\s+/);
    if (
      words.length === 1 &&
      normalized.length >= 3 &&
      normalized.length <= 8
    ) {
      const withDots = normalized.split('').join('.') + '.';
      variants.push(withDots);
      variants.push(withDots.toUpperCase());
    }

    // Try acronym style: Linda -> L.I.N.D.A, also LINDA
    const upperNoDots = normalized.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (upperNoDots !== normalized.toUpperCase()) variants.push(upperNoDots);

    // Clean special chars
    const clean = normalized
      .replace(/[^\w\s\-'&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean !== normalized) variants.push(clean);

    return [...new Set(variants)].filter((v) => v.length > 0);
  }

  /**
   * Normalizes an artist name for comparison.
   * Converts variants like "L.I.N.D.A." and "Linda" to the same format.
   */
  normalizeArtistForComparison(str: string): string {
    return str
      .toLowerCase()
      .replace(/^(dj|mc|dr|mr|ms|the)\s+/i, '')
      .replace(/[.\-_'*]/g, '')
      .replace(/\s+/g, '')
      .replace(/(\d+)$/, '')
      .trim();
  }

  /**
   * Normalizes a string for general comparison (titles, etc.)
   */
  normalizeForComparison(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/\s*[([][^)\]]*[)\]]\s*/g, '')
      .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalizes a title for track matching.
   * Removes punctuation, apostrophes, extra spaces.
   */
  normalizeTitleForMatching(str: string): string {
    return str
      .toLowerCase()
      .replace(/[.'!?,;:\-_'"]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts base title and mix/version info from parentheses.
   * Example: "Rock This Place (H.Seral V.)" → { base: "Rock This Place", mixInfo: "H.Seral V." }
   */
  extractParenthesisInfo(title: string): {
    base: string;
    mixInfo: string;
    full: string;
  } {
    const match = title.match(/^(.+?)\s*[([]([^)\]]+)[)\]]\s*$/);
    if (match) {
      return {
        base: match[1].trim(),
        mixInfo: match[2].trim(),
        full: title,
      };
    }
    return { base: title, mixInfo: '', full: title };
  }

  /**
   * Generates search variants for a title.
   */
  normalizeTitleForSearch(title: string): string[] {
    if (!title) return [];

    const variants: string[] = [title];
    const parsed = this.extractParenthesisInfo(title);

    // Base title without parenthesis
    if (parsed.base !== title) {
      variants.push(parsed.base);
    }

    // Mix info only if it's descriptive
    if (parsed.mixInfo && parsed.mixInfo.length > 3) {
      variants.push(`${parsed.base} ${parsed.mixInfo}`);
    }

    // Remove common suffixes
    let cleaned = title
      .replace(/\s*[([][^)\]]*[)\]]\s*/g, ' ')
      .replace(
        /\s*-\s*(original mix|radio edit|extended mix|club mix|dub mix|remix|instrumental).*$/gi,
        '',
      )
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned !== title && cleaned.length > 2) {
      variants.push(cleaned);
    }

    // Remove featuring
    cleaned = title.replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '').trim();
    if (cleaned !== title) variants.push(cleaned);

    return [...new Set(variants)].filter((v) => v.length > 0);
  }

  /**
   * Calculates similarity between two strings (0-1).
   * Based on Levenshtein distance.
   */
  calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1;

    // One contains the other
    if (s1.includes(s2)) return s2.length / s1.length;
    if (s2.includes(s1)) return s1.length / s2.length;

    // Levenshtein-like similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    // Calculate edit distance (simplified)
    const costs: number[] = [];
    for (let i = 0; i <= shorter.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= longer.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[longer.length] = lastValue;
    }

    return (longer.length - costs[longer.length]) / longer.length;
  }

  /**
   * Checks if a string looks like a raw filename (not a proper tag).
   */
  looksLikeFilename(tag: string): boolean {
    // Too long for a real title/artist
    if (tag.length > 80) return true;

    // Contains numeric codes (5+ digits): -003971
    if (/\d{5,}/.test(tag)) return true;

    // Ends with year-number-code pattern: -2010-1-003971
    if (/[-_]\d{4}[-_]\d+[-_]\d+/.test(tag)) return true;

    // Ends with numeric suffix: -003971, _12345
    if (/[-_]\d{4,}$/.test(tag)) return true;

    // Starts with track number with space: "05 - ", "1 - ", "12 - "
    if (/^\d{1,2}\s+-\s+/.test(tag)) return true;

    // Starts with track number compact: "06-Artist", "1-Title"
    if (/^\d{1,2}-[A-Za-z]/.test(tag)) return true;

    // Starts with vinyl code: (A1), [B2], A1, etc.
    if (/^[([][A-D][1-9²³¹][)\]]?\s/i.test(tag)) return true;

    // Contains underscores in long strings (typical filename separator)
    if (/_/.test(tag) && tag.length > 25) return true;

    // Contains multiple " - " separators (common filename pattern)
    if ((tag.match(/ - /g) || []).length >= 2) return true;

    // Contains duration-like pattern in the middle: -5.22-192-
    if (/[-_]\d{1,2}\.\d{2}[-_]\d{2,3}/.test(tag)) return true;

    // Contains multiple compact separators with artist-like pattern: "Artist-Title-Suffix"
    if (/^[A-Za-z].*-[A-Za-z].*-\d/.test(tag)) return true;

    return false;
  }

  /**
   * Validates if a tag value is usable (not empty and not a filename).
   */
  isValidTag(tag: string | undefined): boolean {
    if (!tag || tag.trim().length < 2) return false;
    return !this.looksLikeFilename(tag);
  }
}

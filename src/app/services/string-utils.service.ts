import { Injectable } from '@angular/core';

/**
 * Service for string normalization and comparison utilities.
 * Used for artist names, track titles, and filename parsing.
 */
@Injectable({
  providedIn: 'root',
})
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
    if (noNumbers !== normalized && noNumbers.length > 2) variants.push(noNumbers);

    // Clean special chars (remove dots, etc): L.I.N.D.A. -> LINDA
    const noDots = normalized.replace(/\./g, '');
    if (noDots !== normalized) variants.push(noDots);

    // Try adding dots between letters for short names (Linda -> L.I.N.D.A.)
    const words = normalized.split(/\s+/);
    if (words.length === 1 && normalized.length >= 3 && normalized.length <= 8) {
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
   * Cleans artist name by removing "Vol/Volume/Part" suffixes which are often release info.
   * Example: "Octopussy Vol 2" -> "Octopussy"
   */
  cleanArtistName(artist: string): string {
    if (!artist) return '';

    // Remove "Vol X", "Volume X", "Vol. X", "Part X", "Pt X", "Pt. X"
    // Handles numbers (1, 2) and Roman numerals (I, II, III, IV, V)
    const volRegex = /\s+(?:vol|volume|pt|part)\.?\s*(?:\d+|[IVX]+)\s*$/i;

    // Also handle just "Vol 2" without space if it happens (rare) or " - Vol 2"
    const volRegexLoose = /[\s-]+(?:vol|volume|pt|part)\.?\s*(?:\d+|[IVX]+)\s*$/i;

    let cleaned = artist.replace(volRegex, '').trim();
    if (cleaned === artist) {
      cleaned = artist.replace(volRegexLoose, '').trim();
    }

    return cleaned;
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
  extractParenthesisInfo(title: string): { base: string; mixInfo: string; full: string } {
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
   * Aggressively removes ALL content within parentheses or brackets.
   * "Spring (1996 Original) (Vocal Mix)" -> "Spring"
   */
  stripParentheses(str: string): string {
    if (!str) return '';
    return str
      .replace(/[([].*?[)\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
   * Checks if an artist name indicates a compilation (Various Artists).
   */
  isVariousArtists(artist: string): boolean {
    if (!artist) return false;
    const lower = artist.toLowerCase();
    return (
      lower === 'various' ||
      lower === 'various artists' ||
      lower === 'various production' ||
      lower.includes('various artists')
    );
  }

  /**
   * Checks if a string looks like a raw filename (not a proper tag).
   * A proper tag should be either a pure artist OR a pure title, not both combined.
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
    if (/^[([ ]?[A-D][1-9²³¹][)\]]?\s/i.test(tag)) return true;

    // Contains underscores in long strings (typical filename separator)
    if (/_/.test(tag) && tag.length > 25) return true;

    // Contains multiple " - " separators (common filename pattern)
    if ((tag.match(/ - /g) || []).length >= 2) return true;

    // Contains duration-like pattern in the middle: -5.22-192-
    if (/[-_]\d{1,2}\.\d{2}[-_]\d{2,3}/.test(tag)) return true;

    // Contains multiple compact separators with artist-like pattern: "Artist-Title-Suffix"
    // Pattern: word-word-numbers (3+ parts separated by hyphens with numeric ending)
    if (/^[A-Za-z].*-[A-Za-z].*-\d/.test(tag)) return true;

    // NEW: Looks like "Artist - Title" pattern (single separator with content on both sides)
    // A proper title shouldn't contain " - " with substantial content on both sides
    const dashParts = tag.split(' - ');
    if (dashParts.length === 2) {
      const left = dashParts[0].trim();
      const right = dashParts[1].trim();
      // Both parts have meaningful content (at least 2 chars each)
      // This indicates it's likely "Artist - Title" and not a standalone tag
      if (
        left.length >= 2 &&
        right.length >= 2 &&
        /^[A-Za-z]/.test(left) &&
        /^[A-Za-z]/.test(right)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validates if a tag value is usable (not empty and not a filename).
   */
  isValidTag(tag: string | undefined): boolean {
    if (!tag || tag.trim().length < 2) return false;
    return !this.looksLikeFilename(tag);
  }

  /**
   * Fixes common typos by reducing repeated letters.
   * Examples: "Twoo" → "Two", "Goood" → "Good", "Daaance" → "Dance"
   *
   * Strategy: Process word by word to avoid breaking legitimate double letters
   * like "good", "cool", "bass", etc.
   */
  fixRepeatedLetters(str: string): string[] {
    // Common words with legitimate double letters that should NOT be reduced
    const legitimateDoubles = new Set([
      'good',
      'cool',
      'bass',
      'boom',
      'mood',
      'room',
      'doom',
      'zoom',
      'free',
      'feel',
      'need',
      'feed',
      'speed',
      'seen',
      'been',
      'keen',
      'deep',
      'keep',
      'sleep',
      'sweet',
      'street',
      'meet',
      'feet',
      'all',
      'call',
      'fall',
      'ball',
      'wall',
      'hall',
      'tall',
      'small',
      'full',
      'pull',
      'bull',
      'still',
      'will',
      'kill',
      'fill',
      'chill',
      'miss',
      'kiss',
      'pass',
      'mass',
      'lass',
      'glass',
      'class',
      'grass',
      'off',
      'stuff',
      'buff',
      'puff',
      'tuff',
      'riff',
      'stiff',
      'add',
      'odd',
      'buzz',
      'jazz',
      'fizz',
      'fuzz',
      'groove',
      'smooth',
      'loop',
      'roof',
      'proof',
      'tool',
      'pool',
      'fool',
      'teen',
      'green',
      'queen',
      'scene',
      'screen',
      'wood',
      'hood',
      'food',
      'blood',
      'flood',
      'book',
      'look',
      'hook',
      'took',
      'cook',
      'shook',
      'poor',
      'door',
      'floor',
      'moor',
      'too',
      'boo',
      'woo',
      'zoo',
      'goo',
      'bee',
      'see',
      'fee',
      'lee',
      'tee',
      'wee',
      'ill',
      'bell',
      'cell',
      'dell',
      'fell',
      'hell',
      'jell',
      'sell',
      'tell',
      'well',
      'yell',
      'spell',
      'smell',
      'shell',
      'swell',
      'dwell',
    ]);

    // Process each word separately
    const words = str.split(/(\s+)/); // Keep spaces
    const fixedWords: string[][] = [];

    for (const word of words) {
      if (/^\s+$/.test(word)) {
        // It's whitespace, keep as is
        fixedWords.push([word]);
        continue;
      }

      const wordLower = word.toLowerCase();
      const wordVariants: string[] = [word];

      // Check if this word has suspicious repeated letters (3+ or unusual doubles)
      const hasTriple = /(.)\1{2,}/i.test(word);
      const hasDouble = /(.)\1/i.test(word);

      if (hasTriple || hasDouble) {
        // Only fix if the word is NOT a legitimate double-letter word
        if (!legitimateDoubles.has(wordLower)) {
          // Try reducing triple+ to single
          if (hasTriple) {
            const reduced = word.replace(/(.)\1{2,}/gi, '$1');
            if (reduced !== word) wordVariants.push(reduced);

            // Also try triple to double
            const toDouble = word.replace(/(.)\1{2,}/gi, '$1$1');
            if (toDouble !== word && toDouble !== reduced) wordVariants.push(toDouble);
          }

          // Try reducing double to single (only if not legitimate)
          if (hasDouble) {
            const reduced = word.replace(/(.)\1/gi, '$1');
            if (reduced !== word && !wordVariants.includes(reduced)) {
              wordVariants.push(reduced);
            }
          }
        }
      }

      fixedWords.push([...new Set(wordVariants)]);
    }

    // Generate all combinations of word variants
    const generateCombinations = (arrays: string[][], index = 0, current = ''): string[] => {
      if (index === arrays.length) return [current];
      const results: string[] = [];
      for (const variant of arrays[index]) {
        results.push(...generateCombinations(arrays, index + 1, current + variant));
      }
      return results;
    };

    const allVariants = generateCombinations(fixedWords);
    return [...new Set([str, ...allVariants])].filter((v) => v.length > 0);
  }

  /**
   * Generates fuzzy variants for a search term.
   * Handles common typos and variations.
   */
  generateFuzzyVariants(str: string): string[] {
    if (!str || str.length < 2) return [str];

    const variants: string[] = [str];

    // 1. Fix repeated letters (e.g., "Twoo" → "Two")
    const repeatedFixed = this.fixRepeatedLetters(str);
    variants.push(...repeatedFixed);

    // 2. Apply typo fixes to all current variants
    const allCurrentVariants = [...variants];
    for (const v of allCurrentVariants) {
      // Common letter substitutions (typos)
      const typoMappings: [RegExp, string][] = [
        [/ph/gi, 'f'], // "Phat" → "Fat"
        [/f/gi, 'ph'], // "Fat" → "Phat"
        [/ck/gi, 'k'], // "Teck" → "Tek"
        [/k(?=[aeiou])/gi, 'c'], // "Kore" → "Core"
        [/c(?=[aeiou])/gi, 'k'], // "Core" → "Kore"
        [/y$/i, 'ie'], // "Party" → "Partie"
        [/ie$/i, 'y'], // "Partie" → "Party"
        [/x/gi, 'ks'], // "Max" → "Maks"
        [/ks/gi, 'x'], // "Maks" → "Max"
      ];

      for (const [pattern, replacement] of typoMappings) {
        const variant = v.replace(pattern, replacement);
        if (variant !== v && !variants.includes(variant)) {
          variants.push(variant);
        }
      }
    }

    // 3. Number/word substitutions (common in electronic music)
    const numberWords: [RegExp, string][] = [
      [/\btwo\b/gi, '2'], // "Two Good" → "2 Good"
      [/\b2\b/g, 'Two'], // "2 Good" → "Two Good"
      [/\bone\b/gi, '1'],
      [/\b1\b/g, 'One'],
      [/\bthree\b/gi, '3'],
      [/\b3\b/g, 'Three'],
      [/\bfour\b/gi, '4'],
      [/\b4\b/g, 'Four'],
      [/\bfor\b/gi, '4'], // "4 U" style
      [/\bto\b/gi, '2'], // "2 U" style
      [/\byou\b/gi, 'U'],
      [/\bu\b/gi, 'You'],
      [/\bare\b/gi, 'R'], // "People R" style
      [/\br\b/gi, 'Are'],
    ];

    const variantsForNumbers = [...variants];
    for (const v of variantsForNumbers) {
      for (const [pattern, replacement] of numberWords) {
        const variant = v.replace(pattern, replacement);
        if (variant !== v && !variants.includes(variant)) {
          variants.push(variant);
        }
      }
    }

    // 4. Common word simplifications for DJ names
    const words = str.split(/\s+/);
    if (words.length >= 2) {
      // Try without spaces: "Two Good" → "TwoGood"
      variants.push(words.join(''));

      // Try with hyphen: "Two Good" → "Two-Good"
      variants.push(words.join('-'));

      // Try with single initial: "Two Good" → "T. Good" or "T Good"
      const withInitial = words[0][0] + '. ' + words.slice(1).join(' ');
      variants.push(withInitial);
      variants.push(words[0][0] + ' ' + words.slice(1).join(' '));
    }

    // 5. Compound Name Splitting (e.g., "Basemania" -> "Base Mania")
    const compoundVariants = this.generateCompoundVariants(str);
    variants.push(...compoundVariants);

    // Limit to reasonable number of variants
    return [...new Set(variants.filter((v) => v.length > 0))].slice(0, 20);
  }

  /**
   * Generates compound variants for single-word artists.
   * Example: "Basemania" -> "Base Mania"
   */
  generateCompoundVariants(str: string): string[] {
    if (!str || str.includes(' ') || str.length < 5) return [];

    const variants: string[] = [];
    const lower = str.toLowerCase();

    // 1. CamelCase Split (if original has mixed case)
    // "BaseMania" -> "Base Mania"
    const camelSplit = str.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (camelSplit !== str) {
      variants.push(camelSplit);
    }

    // 2. Common Prefixes/Suffixes Split
    const commonWords = [
      'base',
      'hard',
      'soft',
      'new',
      'old',
      'deep',
      'dark',
      'light',
      'blue',
      'red',
      'club',
      'house',
      'trance',
      'techno',
      'dance',
      'euro',
      'happy',
      'acid',
      'mania',
      'project',
      'system',
      'zone',
      'time',
      'boy',
      'girl',
      'man',
      'woman',
      'crew',
      'squad',
      'inc',
      'ltd',
      'mix',
      'remix',
      'best',
      'star',
      'fire',
      'ice',
      'beat',
      'bass',
      'drum',
      'jungle',
      'core',
      'style',
      'force',
      'power',
      'mega',
      'super',
      'ultra',
      'hyper',
      'cyber',
      'space',
      'galaxy',
      'future',
      'past',
      'dream',
      'night',
      'day',
      'love',
      'hate',
      'life',
      'death',
      'soul',
      'mind',
      'body',
      'head',
      'hand',
      'foot',
      'eye',
      'ear',
      'mouth',
      'nose',
      'face',
      'tek',
    ];

    for (const word of commonWords) {
      // Check Prefix
      if (lower.startsWith(word) && lower.length > word.length + 2) {
        // "Basemania" starts with "base"
        const remainder = str.substring(word.length);
        const variant = str.substring(0, word.length) + ' ' + remainder;
        variants.push(variant);

        // Also try capitalizing matches: "Base Mania"
        const capVariant =
          this.capitalizeFirst(str.substring(0, word.length)) +
          ' ' +
          this.capitalizeFirst(remainder);
        variants.push(capVariant);
      }

      // Check Suffix
      if (lower.endsWith(word) && lower.length > word.length + 2) {
        // "Basemania" ends with "mania"
        const prefixLen = str.length - word.length;
        const prefix = str.substring(0, prefixLen);
        const variant = prefix + ' ' + str.substring(prefixLen);
        variants.push(variant);

        const capVariant =
          this.capitalizeFirst(prefix) + ' ' + this.capitalizeFirst(str.substring(prefixLen));
        variants.push(capVariant);
      }
    }

    return [...new Set(variants)];
  }

  private capitalizeFirst(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /**
   * Calculates if two strings are "close enough" considering typos.
   * Returns true if similarity is above threshold after trying fuzzy variants.
   */
  areSimilarWithTypos(str1: string, str2: string, threshold = 0.7): boolean {
    // Direct comparison
    const directSim = this.calculateStringSimilarity(
      this.normalizeArtistForComparison(str1),
      this.normalizeArtistForComparison(str2),
    );
    if (directSim >= threshold) return true;

    // Try fuzzy variants
    const variants1 = this.generateFuzzyVariants(str1);
    const variants2 = this.generateFuzzyVariants(str2);

    for (const v1 of variants1) {
      for (const v2 of variants2) {
        const sim = this.calculateStringSimilarity(
          this.normalizeArtistForComparison(v1),
          this.normalizeArtistForComparison(v2),
        );
        if (sim >= threshold) return true;
      }
    }

    return false;
  }

  /**
   * Formats a list of artists into a single string using their 'join' property.
   * Also cleans Discogs numeric suffixes (e.g., "Artist (2)").
   */
  formatArtistName(artists: { name: string; join?: string }[] | undefined): string {
    if (!artists || artists.length === 0) return '';

    return artists
      .map((a, index) => {
        // Clean "Name (2)" -> "Name"
        const cleanName = a.name.replace(/\s*\(\d+\)$/, '');

        // Handle join string
        let suffix = '';
        if (index < artists.length - 1) {
          // Use provided join or default to " / "
          // Discogs joins often come as "," or "Vs." or "&".
          // We add spaces around it if it looks like a word or symbol that needs it.
          // Actually Discogs 'join' usually needs spaces added around it unless it is ",".
          const j = a.join ? a.join.trim() : '/';
          if (j === ',') {
            suffix = ', ';
          } else {
            suffix = ` ${j} `;
          }
        }
        return cleanName + suffix;
      })
      .join('')
      .trim();
  }

  /**
   * Determines the best artist name by comparing Release Artist, Track Artist, and Manual Input.
   * Logic:
   * 1. Start with Release Artist.
   * 2. If Track Artist exists:
   *    - If Track Artist is "richer" (contains Release Artist), use Track Artist.
   *    - If Release Artist is "richer" (contains Track Artist), use Release Artist.
   *    - Otherwise, prefer Track Artist (distinct artist).
   * 3. If Manual Input exists (Heuristic):
   *    - If Manual Input is "richer" than current best (contains it), use Manual Input.
   */
  resolveBestArtist(
    trackArtists: { name: string; join?: string }[] | undefined,
    releaseArtist: string,
    manualArtist?: string
  ): string {
    const trackArtist = this.formatArtistName(trackArtists);
    const normTrack = this.normalizeArtistForComparison(trackArtist);
    const normRelease = this.normalizeArtistForComparison(releaseArtist);
    const normManual = manualArtist ? this.normalizeArtistForComparison(manualArtist) : '';

    let bestArtist = releaseArtist;

    if (trackArtist) {
      if (normTrack.includes(normRelease) && normTrack.length > normRelease.length) {
        // Track artist is richer (e.g. "Artist feat. X")
        bestArtist = trackArtist;
      } else if (normRelease.includes(normTrack) && normRelease.length > normTrack.length) {
        // Release artist is richer (e.g. "Artist & Partner" vs "Artist")
        bestArtist = releaseArtist;
      } else {
        // Distinct artists, prefer specific track artist
        bestArtist = trackArtist;
      }
    }

    // Heuristic Enrichment
    if (manualArtist && normManual && bestArtist) {
      const normBest = this.normalizeArtistForComparison(bestArtist);
      if (normManual.includes(normBest) && normManual.length > normBest.length) {
        return manualArtist;
      }
    }

    return bestArtist;
  }
    /**
   * Calculates similarity between two strings (0 to 1).
   * Uses Levenshtein distance.
   */
  calculateSimilarity(s1: string, s2: string): number {
    if (!s1 && !s2) return 1;
    if (!s1 || !s2) return 0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;

    const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longerLength - distance) / longerLength;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}


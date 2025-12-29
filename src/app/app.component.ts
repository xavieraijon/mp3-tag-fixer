import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Services
import { DiscogsService } from './services/discogs.service';
import { FileProcessorService } from './services/file-processor.service';

// Models
import { ProcessedFile } from './models/processed-file.model';
import { Mp3Tags } from './models/mp3-tags.model';
import { DiscogsRelease, DiscogsTrack } from './models/discogs.model';

// Components
import { DropzoneComponent } from './components/dropzone/dropzone.component';
import { FilterBarComponent } from './components/filter-bar/filter-bar.component';
import { FileCardComponent } from './components/file-card/file-card.component';
import { TagEditorComponent } from './components/tag-editor/tag-editor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DropzoneComponent,
    FilterBarComponent,
    FileCardComponent,
    TagEditorComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent {
  private discogs = inject(DiscogsService);
  private processor = inject(FileProcessorService);

  files = signal<ProcessedFile[]>([]);
  filterQuery = signal<string>('');

  // Tag Editor State
  editingItem = signal<ProcessedFile | null>(null);
  editForm = signal<Mp3Tags>({});

  // Global Actions State
  isAnalyzingBpm = signal(false);
  isDownloadingZip = signal(false);

  // Global Notification (snackbar)
  globalMessage = signal<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Derived
  filteredFiles = computed(() => {
    const q = this.filterQuery().toLowerCase().trim();
    if (!q) return this.files();
    return this.files().filter(f =>
      f.originalName.toLowerCase().includes(q) ||
      f.selectedTrack?.title.toLowerCase().includes(q) ||
      f.manualArtist?.toLowerCase().includes(q) ||
      f.manualTitle?.toLowerCase().includes(q)
    );
  });

  async addFiles(newFiles: File[]) {
    for (const file of newFiles) {
      await this.processNewFile(file);
    }
  }

  private async processNewFile(file: File) {
    if (this.files().some(f => f.originalName === file.name)) return;

    // Initial Tags from ID3
    let tags: Mp3Tags = {};
    try {
        tags = await this.processor.readTags(file);
    } catch (e) {
        console.warn('Could not read ID3 tags', e);
    }

    // Parse Filename
    const { artist: parsedArtist, title: parsedTitle } = this.processor.parseFilename(file.name);

    // Heuristic: Use tags if they look valid, otherwise use parsed filename
    // Tags are "invalid" if they look like raw filenames
    const looksLikeFilename = (tag: string): boolean => {
      // Too long for a real title/artist
      if (tag.length > 80) return true;

      // Contains numeric codes (5+ digits): -003971
      if (/\d{5,}/.test(tag)) return true;

      // Ends with year-number-code pattern: -2010-1-003971
      if (/[-_]\d{4}[-_]\d+[-_]\d+/.test(tag)) return true;

      // Ends with numeric suffix: -003971, _12345
      if (/[-_]\d{4,}$/.test(tag)) return true;

      // Starts with track number: "05 - ", "1 - ", "12 - "
      if (/^\d{1,2}\s+-\s+/.test(tag)) return true;

      // Starts with vinyl code: (A1), [B2], A1, etc.
      if (/^[\(\[]?[A-D][1-9²³¹][\)\]]?\s/i.test(tag)) return true;

      // Contains underscores in long strings (typical filename separator)
      if (/_/.test(tag) && tag.length > 25) return true;

      // Contains multiple " - " separators (common filename pattern)
      if ((tag.match(/ - /g) || []).length >= 2) return true;

      return false;
    };

    const isValidTag = (tag: string | undefined): boolean => {
      if (!tag || tag.trim().length < 2) return false;
      return !looksLikeFilename(tag);
    };

    const tagArtist = isValidTag(tags.artist) ? tags.artist : undefined;
    const tagTitle = isValidTag(tags.title) ? tags.title : undefined;

    // Prefer valid tags, fallback to parsed filename
    const initialArtist = tagArtist || parsedArtist;
    const initialTitle = tagTitle || parsedTitle;

    console.log(`[ProcessFile] ${file.name}`);
    console.log(`  Tags: artist="${tags.artist || ''}" title="${tags.title || ''}"`);
    console.log(`  Parsed: artist="${parsedArtist}" title="${parsedTitle}"`);
    console.log(`  Final: artist="${initialArtist}" title="${initialTitle}"`);

    const newItem: ProcessedFile = {
      file,
      originalName: file.name,
      currentTags: tags,
      status: 'pending',
      statusMessage: 'Ready to search.',
      searchResults: [],
      tracks: [],
      manualArtist: initialArtist,
      manualTitle: initialTitle
    };

    this.files.update(current => [newItem, ...current]);
  }

  // --- Search Logic ---

  /**
   * Convierte superíndices a números normales
   * ¹²³ → 123
   */
  private normalizeSuperscripts(str: string): string {
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
   * Normaliza nombre de artista (DJ names, etc.)
   * Genera múltiples variantes para búsqueda
   */
  private normalizeArtistName(artist: string): string[] {
    if (!artist) return [];

    const variants: string[] = [artist];
    let normalized = artist.trim();

    // Normalizar superíndices: HS² → HS2
    const withNormalNumbers = this.normalizeSuperscripts(normalized);
    if (withNormalNumbers !== normalized) {
      variants.push(withNormalNumbers);
      normalized = withNormalNumbers; // Usar versión normalizada para el resto
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
    const clean = normalized.replace(/[^\w\s\-'&]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean !== normalized) variants.push(clean);

    return [...new Set(variants)].filter(v => v.length > 0);
  }

  /**
   * Extrae información del paréntesis (remix, mix, edit, etc.)
   */
  private extractParenthesisInfo(title: string): { base: string; mixInfo: string; full: string } {
    const match = title.match(/^(.+?)\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
    if (match) {
      return {
        base: match[1].trim(),
        mixInfo: match[2].trim(),
        full: title
      };
    }
    return { base: title, mixInfo: '', full: title };
  }

  /**
   * Normaliza un título para búsqueda
   */
  private normalizeTitleForSearch(title: string): string[] {
    if (!title) return [];

    const variants: string[] = [title];
    const parsed = this.extractParenthesisInfo(title);

    // Base title without parenthesis
    if (parsed.base !== title) {
      variants.push(parsed.base);
    }

    // Mix info only if it's descriptive
    if (parsed.mixInfo && parsed.mixInfo.length > 3) {
      // "Observer (Influence Mix)" -> try "Observer Influence Mix"
      variants.push(`${parsed.base} ${parsed.mixInfo}`);
    }

    // Remove common suffixes
    let cleaned = title
      .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, ' ')
      .replace(/\s*-\s*(original mix|radio edit|extended mix|club mix|dub mix|remix|instrumental).*$/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned !== title && cleaned.length > 2) {
      variants.push(cleaned);
    }

    // Remove featuring
    cleaned = title.replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '').trim();
    if (cleaned !== title) variants.push(cleaned);

    return [...new Set(variants)].filter(v => v.length > 0);
  }

  /**
   * Genera todas las estrategias de búsqueda posibles
   * IMPORTANTE: Las primeras estrategias son búsquedas DIRECTAS con los valores exactos
   * Solo después se aplican normalizaciones y variantes
   */
  private generateSearchStrategies(artist: string, title: string): Array<{
    type: 'release' | 'track' | 'query';
    artist: string;
    title: string;
    searchType: 'master' | 'release' | 'all';
    description: string;
    priority: number;
  }> {
    const strategies: Array<{
      type: 'release' | 'track' | 'query';
      artist: string;
      title: string;
      searchType: 'master' | 'release' | 'all';
      description: string;
      priority: number;
    }> = [];

    let priority = 0;

    // === PHASE 0: BÚSQUEDA DIRECTA (máxima prioridad) ===
    // Usar exactamente los valores que el usuario ve en los inputs
    // Esto es crucial cuando los tags/inputs ya están bien

    // 0.1 Query directa: "Artist - Title" (como buscaría un humano)
    if (artist && title) {
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} - ${title}`,
        searchType: 'all',
        description: `Direct: "${artist} - ${title}"`,
        priority: priority++
      });

      // 0.2 Query sin guión: "Artist Title"
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} ${title}`,
        searchType: 'all',
        description: `Direct: "${artist} ${title}"`,
        priority: priority++
      });
    }

    // 0.3 Búsqueda exacta por track (sin modificar nada)
    if (artist && title) {
      strategies.push({
        type: 'track',
        artist: artist,
        title: title,
        searchType: 'all',
        description: `Track exact: "${artist}" - "${title}"`,
        priority: priority++
      });
    }

    // 0.4 Búsqueda exacta por release
    if (artist && title) {
      strategies.push({
        type: 'release',
        artist: artist,
        title: title,
        searchType: 'master',
        description: `Master exact: "${artist}" - "${title}"`,
        priority: priority++
      });
    }

    // Ahora sí generamos las variantes para búsquedas más complejas
    const artistVariants = this.normalizeArtistName(artist);
    const titleVariants = this.normalizeTitleForSearch(title);
    const titleParsed = this.extractParenthesisInfo(title);

    // === PHASE 1: Búsquedas con título base (sin paréntesis) ===
    // Esto es CRÍTICO cuando el paréntesis contiene basura como "(Hq Quality)"

    if (titleParsed.base !== title && titleParsed.base.length > 2) {
      // 1.1 Query directa con título base: "Artist - TitleBase"
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} - ${titleParsed.base}`,
        searchType: 'all',
        description: `Direct base: "${artist} - ${titleParsed.base}"`,
        priority: priority++
      });

      // 1.2 Query con título base sin guión
      strategies.push({
        type: 'query',
        artist: '',
        title: `${artist} ${titleParsed.base}`,
        searchType: 'all',
        description: `Query base: "${artist} ${titleParsed.base}"`,
        priority: priority++
      });

      // 1.3 Track con título base
      strategies.push({
        type: 'track',
        artist: artist,
        title: titleParsed.base,
        searchType: 'all',
        description: `Track base: "${artist}" - "${titleParsed.base}"`,
        priority: priority++
      });

      // 1.4 Release/Master con título base
      strategies.push({
        type: 'release',
        artist: artist,
        title: titleParsed.base,
        searchType: 'master',
        description: `Master base: "${artist}" - "${titleParsed.base}"`,
        priority: priority++
      });
    }

    // === PHASE 2: Track searches con variantes de artista ===

    for (const a of artistVariants.slice(1, 4)) { // Skip first (original)
      strategies.push({
        type: 'track',
        artist: a,
        title: titleParsed.base,
        searchType: 'all',
        description: `Track: "${a}" - "${titleParsed.base}"`,
        priority: priority++
      });
    }

    // === PHASE 3: Release searches con variantes ===

    for (const a of artistVariants.slice(1, 3)) {
      for (const t of titleVariants.slice(0, 2)) {
        strategies.push({
          type: 'release',
          artist: a,
          title: t,
          searchType: 'master',
          description: `Master: "${a}" - "${t}"`,
          priority: priority++
        });
      }
    }

    // === PHASE 4: Búsquedas más amplias ===

    // 4.1 Track sin artista (buscar solo el título)
    strategies.push({
      type: 'track',
      artist: '',
      title: titleParsed.base,
      searchType: 'all',
      description: `Track any artist: "${titleParsed.base}"`,
      priority: priority++
    });

    // 4.2 Query solo título
    strategies.push({
      type: 'query',
      artist: '',
      title: titleParsed.base,
      searchType: 'all',
      description: `Query title only: "${titleParsed.base}"`,
      priority: priority++
    });

    // 4.3 Release sin título (solo artista)
    for (const a of artistVariants.slice(0, 2)) {
      strategies.push({
        type: 'release',
        artist: a,
        title: '',
        searchType: 'master',
        description: `Artist only: "${a}"`,
        priority: priority++
      });
    }

    // === PHASE 5: Fallbacks ===

    // 5.1 Release type en vez de master
    for (const a of artistVariants.slice(0, 2)) {
      for (const t of titleVariants.slice(0, 2)) {
        strategies.push({
          type: 'release',
          artist: a,
          title: t,
          searchType: 'release',
          description: `Release: "${a}" - "${t}"`,
          priority: priority++
        });
      }
    }

    // 5.2 Swapped artist/title (a veces los nombres están al revés)
    if (artist && title && artist !== title) {
      strategies.push({
        type: 'track',
        artist: titleParsed.base,
        title: artist,
        searchType: 'all',
        description: `Swapped: "${titleParsed.base}" - "${artist}"`,
        priority: priority++
      });
    }

    // Sort by priority and remove duplicates
    const seen = new Set<string>();
    return strategies
      .sort((a, b) => a.priority - b.priority)
      .filter(s => {
        const key = `${s.type}:${s.artist}:${s.title}:${s.searchType}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  /**
   * Calcula similitud entre dos strings (0-1) usando algoritmo de similitud
   * Basado en coincidencia de caracteres y orden
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
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
   * Normaliza un nombre de artista para comparación
   * Convierte variantes como "L.I.N.D.A." y "Linda" al mismo formato
   */
  private normalizeArtistForComparison(str: string): string {
    return str
      .toLowerCase()
      .replace(/^(dj|mc|dr|mr|ms|the)\s+/i, '') // Remove common prefixes
      .replace(/[.\-_'*]/g, '') // Remove dots, hyphens, underscores, apostrophes, asterisks
      .replace(/\s+/g, '') // Remove spaces
      .replace(/(\d+)$/, '') // Remove trailing numbers
      .trim();
  }

  /**
   * Normaliza un string para comparación general (títulos, etc.)
   */
  private normalizeForComparison(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, '') // Remove (remix), [edit]
      .replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '') // Remove featuring
      .replace(/[^a-z0-9\s]/g, '') // Solo alfanumérico
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcula score de relevancia para un resultado (MEJORADO v2)
   * Prioriza FUERTEMENTE la coincidencia de artista
   */
  private calculateResultScore(
    result: DiscogsRelease,
    searchArtist: string,
    searchTitle: string
  ): number {
    let score = 0;
    const resultArtist = result.artist || '';
    const resultTitle = result.title || '';

    // === ARTIST MATCHING (0-60 points) - LO MÁS IMPORTANTE ===
    // Solo usar versión normalizada (sin DJ, sin puntuación)
    const normalizedResultArtist = this.normalizeArtistForComparison(resultArtist);
    const normalizedSearchArtist = this.normalizeArtistForComparison(searchArtist);

    const artistSimilarity = this.calculateStringSimilarity(
      normalizedResultArtist,
      normalizedSearchArtist
    );

    // Log para debug
    console.log(`[Score] "${resultArtist}" vs "${searchArtist}" → normalized: "${normalizedResultArtist}" vs "${normalizedSearchArtist}" = ${(artistSimilarity * 100).toFixed(0)}%`);

    let artistScore = 0;
    if (artistSimilarity >= 0.85) {
      artistScore = 60; // Almost exact match
    } else if (artistSimilarity >= 0.7) {
      artistScore = 50; // Very good match
    } else if (artistSimilarity >= 0.5) {
      artistScore = 30; // Decent match
    } else if (artistSimilarity >= 0.4) {
      artistScore = 15; // Weak match
    }
    // Less than 0.4 = 0 points, likely WRONG artist

    score += artistScore;

    // === TITLE MATCHING (0-30 points) ===
    // PERO: Si el artista no coincide bien, limitar puntos de título
    const titleParsed = this.extractParenthesisInfo(searchTitle);
    const baseTitle = titleParsed.base.toLowerCase();
    const resultTitleLower = resultTitle.toLowerCase();

    let titleScore = 0;

    // Check if result title contains the base search title
    if (resultTitleLower === baseTitle) {
      titleScore = 30; // Exact match
    } else if (resultTitleLower.includes(baseTitle)) {
      titleScore = 25; // Result contains search title
    } else if (baseTitle.includes(resultTitleLower)) {
      titleScore = 20; // Search title contains result
    } else {
      // Word-based matching
      const searchWords = baseTitle.split(/\s+/).filter(w => w.length > 2);
      const resultWords = resultTitleLower.split(/\s+/);

      if (searchWords.length > 0) {
        let matchedWords = 0;
        for (const sw of searchWords) {
          if (resultWords.some(rw => rw.includes(sw) || sw.includes(rw))) {
            matchedWords++;
          }
        }
        titleScore = (matchedWords / searchWords.length) * 15;
      }
    }

    // PENALIZACIÓN CRÍTICA: Si el artista no coincide (<50%),
    // el título no puede dar muchos puntos (máximo 10)
    // Esto evita que "DJ Jordan - Creative Destruction" gane a "DJ K-Rrion - Vol. 3"
    if (artistSimilarity < 0.5) {
      titleScore = Math.min(titleScore, 10);
    }

    score += titleScore;

    // === BONUS POINTS (0-10 points) ===

    // Bonus for having year (2 points)
    if (result.year) score += 2;

    // Bonus for master type (2 points)
    if (result.type === 'master') score += 2;

    // Bonus for having cover (1 point)
    if (result.thumb || result.cover_image) score += 1;

    // Bonus for electronic/dance genres (3 points)
    const genres = [...(result.genres || []), ...(result.styles || [])].map(g => g.toLowerCase());
    if (genres.some(g => ['electronic', 'techno', 'house', 'trance', 'dance', 'hardcore', 'gabber', 'makina'].includes(g))) {
      score += 3;
    }

    // SUPER BONUS: Artista casi exacto + título contiene búsqueda (2 points)
    if (artistSimilarity >= 0.7 && resultTitleLower.includes(baseTitle)) {
      score += 2;
    }

    return Math.round(score);
  }

  /**
   * Búsqueda inteligente con múltiples fases y estrategias
   */
  async search(item: ProcessedFile) {
    // Recopilar todas las fuentes de datos disponibles
    const sources = {
      manual: { artist: item.manualArtist || '', title: item.manualTitle || '' },
      tags: { artist: item.currentTags?.artist || '', title: item.currentTags?.title || '' },
      filename: this.processor.parseFilename(item.originalName)
    };

    // Priorizar: manual > tags > filename
    const primaryArtist = sources.manual.artist || sources.tags.artist || sources.filename.artist;
    const primaryTitle = sources.manual.title || sources.tags.title || sources.filename.title;

    if (!primaryArtist && !primaryTitle) {
      this.updateFileItem(item, {
        status: 'error',
        statusMessage: 'No artist or title found. Please enter manually.'
      });
      return;
    }

    this.updateFileItem(item, {
      status: 'searching',
      statusMessage: 'Analyzing search strategies...',
      searchResults: [],
      selectedRelease: undefined,
      releaseDetails: undefined,
      tracks: [],
      selectedTrack: undefined,
      coverImageUrl: undefined
    });

    // Generate all search strategies
    const strategies = this.generateSearchStrategies(primaryArtist, primaryTitle);

    // Also add strategies from ID3 tags if different
    if (sources.tags.artist && sources.tags.title &&
        (sources.tags.artist !== primaryArtist || sources.tags.title !== primaryTitle)) {
      const tagStrategies = this.generateSearchStrategies(sources.tags.artist, sources.tags.title);
      tagStrategies.forEach(s => {
        s.priority += 100; // Lower priority than primary
        s.description = `[ID3] ${s.description}`;
      });
      strategies.push(...tagStrategies);
    }

    console.log(`[Search] Generated ${strategies.length} strategies for "${primaryArtist} - ${primaryTitle}"`);

    let allResults: DiscogsRelease[] = [];
    let attemptCount = 0;
    const maxAttempts = 15;
    const apiDelay = 1200; // ms between API calls (Discogs limit: 60/min)

    // Umbrales para parar la búsqueda
    const EXCELLENT_SCORE = 70;  // Si encontramos esto, parar inmediatamente
    const GOOD_SCORE = 50;       // Si encontramos esto + suficientes resultados, parar
    const MIN_RESULTS_FOR_GOOD = 3;

    for (const strategy of strategies.slice(0, maxAttempts)) {
      attemptCount++;

      this.updateFileItem(item, {
        statusMessage: `Search ${attemptCount}/${Math.min(strategies.length, maxAttempts)}: ${strategy.description}`
      });

      try {
        let results: DiscogsRelease[] = [];

        if (strategy.type === 'track') {
          results = await this.discogs.searchByTrack(strategy.artist, strategy.title, strategy.searchType);
        } else if (strategy.type === 'query') {
          results = await this.discogs.searchQuery(strategy.title, strategy.searchType);
        } else {
          results = await this.discogs.searchRelease(strategy.artist, strategy.title, strategy.searchType);
        }

        console.log(`[Search] Strategy "${strategy.description}" returned ${results.length} results`);

        if (results.length > 0) {
          // Add unique results with scores
          for (const r of results) {
            if (!allResults.some(existing => existing.id === r.id)) {
              (r as any)._score = this.calculateResultScore(r, primaryArtist, primaryTitle);
              allResults.push(r);
            }
          }

          // Sort by score
          allResults.sort((a, b) => ((b as any)._score || 0) - ((a as any)._score || 0));

          const topScore = (allResults[0] as any)?._score || 0;

          // Si encontramos un resultado EXCELENTE, parar inmediatamente
          // Esto es crucial para cuando los inputs ya están bien
          if (topScore >= EXCELLENT_SCORE) {
            console.log(`[Search] Excellent match found (score ${topScore}), stopping immediately`);
            break;
          }

          // Si tenemos suficientes resultados con buena puntuación, parar
          if (allResults.length >= MIN_RESULTS_FOR_GOOD && topScore >= GOOD_SCORE) {
            console.log(`[Search] Found ${allResults.length} results with top score ${topScore}, stopping`);
            break;
          }
        }
      } catch (e) {
        console.warn(`[Search] Strategy "${strategy.description}" failed:`, e);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, apiDelay));
    }

    if (allResults.length > 0) {
      // Log top 5 results with scores for debugging
      console.log(`[Search] Final ranking for "${primaryArtist} - ${primaryTitle}":`);
      allResults.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. [Score: ${(r as any)._score}] ${r.artist} - ${r.title}`);
      });

      this.updateFileItem(item, {
        status: 'ready',
        searchResults: allResults,
        statusMessage: `Found ${allResults.length} results. Selecting best match...`
      });

      // Auto-select the best scored result
      const updatedItem = this.files().find(f => f.originalName === item.originalName);
      if (updatedItem) {
        await this.selectRelease(updatedItem, allResults[0]);
      }
    } else {
      this.updateFileItem(item, {
        status: 'error',
        searchResults: [],
        statusMessage: `No results after ${attemptCount} attempts. Try editing artist/title.`
      });
    }
  }

  async selectRelease(item: ProcessedFile, release: DiscogsRelease) {
      this.updateFileItem(item, {
          selectedRelease: release,
          status: 'loading_details',
          statusMessage: 'Loading tracklist...'
      });

      try {
          const details = await this.discogs.getReleaseDetails(release.id, release.type || 'release');
          const tracks = details.tracklist || [];

          // Get cover image URL (prefer high-res from details, fallback to thumb)
          const coverImageUrl = details.cover_image || release.thumb;

          // Auto-match track
          const matchedTrack = this.findBestTrackMatch(item, tracks);

          if (matchedTrack) {
            this.updateFileItem(item, {
                releaseDetails: details,
                tracks: tracks,
                selectedTrack: matchedTrack,
                coverImageUrl: coverImageUrl,
                status: 'ready',
                statusMessage: `Auto-matched: "${matchedTrack.title}"`
            });
          } else {
            this.updateFileItem(item, {
                releaseDetails: details,
                tracks: tracks,
                coverImageUrl: coverImageUrl,
                status: 'ready',
                statusMessage: tracks.length > 0 ? 'Select a track.' : 'No tracks found.'
            });
          }
      } catch (e) {
          this.updateFileItem(item, { status: 'error', statusMessage: 'Failed to load details.' });
      }
  }

  /**
   * Encuentra el track que mejor coincide con el título y duración del archivo
   * PRIORIDAD: título completo > versión/mix > título base > duración
   */
  private findBestTrackMatch(item: ProcessedFile, tracks: DiscogsTrack[]): DiscogsTrack | undefined {
    if (!tracks || tracks.length === 0) return undefined;

    // Solo tracks reales (no headings)
    const realTracks = tracks.filter(t => t.type_ === 'track');
    if (realTracks.length === 0) return undefined;

    // Si solo hay 1 track, seleccionarlo automáticamente
    if (realTracks.length === 1) {
      return realTracks[0];
    }

    // Obtener datos del archivo
    const searchTitle = item.manualTitle || item.currentTags?.title || this.processor.parseFilename(item.originalName).title;
    const fileDuration = item.currentTags?.duration; // en segundos

    if (!searchTitle) return undefined;

    // Extraer versión/mix del título buscado: "Rock This Place (H.Seral V.)" → base="Rock This Place", version="H.Seral V."
    const searchVersionMatch = searchTitle.match(/^(.+?)\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
    const searchBase = searchVersionMatch ? searchVersionMatch[1].trim() : searchTitle;
    const searchVersion = searchVersionMatch ? searchVersionMatch[2].trim().toLowerCase() : '';

    console.log(`[TrackMatch] Searching: "${searchTitle}" → base="${searchBase}", version="${searchVersion}"`);

    let bestMatch: DiscogsTrack | undefined;
    let bestScore = 0;

    for (const track of realTracks) {
      let score = 0;

      // Extraer versión del track de Discogs
      const trackVersionMatch = track.title.match(/^(.+?)\s*[\(\[]([^\)\]]+)[\)\]]\s*$/);
      const trackBase = trackVersionMatch ? trackVersionMatch[1].trim() : track.title;
      const trackVersion = trackVersionMatch ? trackVersionMatch[2].trim().toLowerCase() : '';

      // Normalizar para comparación: quitar puntuación, apóstrofes, espacios extra
      const normalizeTitle = (s: string) => s.toLowerCase()
        .replace(/[.'!?,;:\-_'"]/g, '')  // Quitar puntuación
        .replace(/\s+/g, ' ')             // Normalizar espacios
        .trim();

      const searchBaseNorm = normalizeTitle(searchBase);
      const trackBaseNorm = normalizeTitle(trackBase);

      // === TÍTULO BASE (0-40 puntos) ===
      if (searchBaseNorm === trackBaseNorm) {
        score += 40; // Match exacto del título base (normalizado)
      } else if (trackBaseNorm.includes(searchBaseNorm) || searchBaseNorm.includes(trackBaseNorm)) {
        score += 30; // Uno contiene al otro
      } else {
        // Similitud parcial
        const similarity = this.calculateStringSimilarity(searchBaseNorm, trackBaseNorm);
        score += similarity * 25;
      }

      // === VERSIÓN/MIX (0-50 puntos) - LO MÁS IMPORTANTE ===
      if (searchVersion && trackVersion) {
        // Normalizar para comparación: quitar puntuación, espacios extra
        const normSearchVersion = searchVersion.replace(/[.\-_]/g, '').replace(/\s+/g, ' ').trim();
        const normTrackVersion = trackVersion.replace(/[.\-_]/g, '').replace(/\s+/g, ' ').trim();

        if (normSearchVersion === normTrackVersion) {
          score += 50; // Match exacto de versión
          console.log(`[TrackMatch]   "${track.title}" → VERSION EXACT MATCH! +50`);
        } else if (normTrackVersion.includes(normSearchVersion) || normSearchVersion.includes(normTrackVersion)) {
          score += 40; // Versión parcial
          console.log(`[TrackMatch]   "${track.title}" → version partial match +40`);
        } else {
          // Similitud de versión
          const versionSim = this.calculateStringSimilarity(normSearchVersion, normTrackVersion);
          if (versionSim > 0.5) {
            score += versionSim * 30;
            console.log(`[TrackMatch]   "${track.title}" → version similarity ${(versionSim * 100).toFixed(0)}%`);
          }
        }
      } else if (searchVersion && !trackVersion) {
        // Buscamos versión específica pero el track no tiene → penalizar
        score -= 10;
      } else if (!searchVersion && trackVersion) {
        // No buscamos versión pero el track tiene una → ligera penalización
        score -= 5;
      }

      // === DURACIÓN (0-10 puntos) - Factor secundario ===
      if (fileDuration && track.duration) {
        const trackDurationSec = this.parseDurationToSeconds(track.duration);
        if (trackDurationSec > 0) {
          const diff = Math.abs(fileDuration - trackDurationSec);
          if (diff <= 3) score += 10;      // Casi exacto
          else if (diff <= 10) score += 7; // Muy cercano
          else if (diff <= 20) score += 4; // Cercano
          else if (diff <= 30) score += 2; // Aceptable
        }
      }

      console.log(`[TrackMatch]   "${track.title}" → TOTAL: ${score}`);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = track;
      }
    }

    console.log(`[TrackMatch] Best match: "${bestMatch?.title}" with score ${bestScore}`);

    // Umbral mínimo para considerar un match válido
    return bestScore >= 30 ? bestMatch : undefined;
  }

  /**
   * Convierte duración string "M:SS" o "MM:SS" a segundos
   */
  private parseDurationToSeconds(duration: string): number {
    if (!duration) return 0;

    const parts = duration.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10) || 0;
      const seconds = parseInt(parts[1], 10) || 0;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // H:MM:SS
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2], 10) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * Calcula score de similitud de duración (0-1)
   * Diferencia de ±5 segundos = score perfecto
   * Diferencia de ±30 segundos = score 0
   */
  private calculateDurationScore(fileDuration: number, trackDuration: number): number {
    const diff = Math.abs(fileDuration - trackDuration);

    if (diff <= 5) return 1.0;      // Casi exacto
    if (diff <= 10) return 0.9;     // Muy cercano
    if (diff <= 15) return 0.7;     // Cercano
    if (diff <= 20) return 0.5;     // Aceptable
    if (diff <= 30) return 0.3;     // Posible
    return 0;                        // Demasiado diferente
  }

  /**
   * Calcula un score de similitud entre dos títulos (0-1)
   */
  private calculateTitleMatchScore(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    // Verificar si uno contiene al otro
    if (str1.includes(str2) || str2.includes(str1)) {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      return shorter.length / longer.length;
    }

    // Contar palabras que coinciden
    const words1 = str1.split(' ').filter(w => w.length > 2);
    const words2 = str2.split(' ').filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    let matchingWords = 0;
    for (const w1 of words1) {
      if (words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))) {
        matchingWords++;
      }
    }

    return matchingWords / Math.max(words1.length, words2.length);
  }

  selectTrack(item: ProcessedFile, track: DiscogsTrack) {
      this.updateFileItem(item, { selectedTrack: track });
  }

  // --- Actions ---

  async detectBpm(item: ProcessedFile) {
      this.updateFileItem(item, { isAnalyzingBpm: true, statusMessage: 'Detecting BPM...' });
      const bpm = await this.processor.detectBpm(item.file);
      if (bpm) {
          const newOverrides = { ...item.tagOverrides, bpm };
          this.updateFileItem(item, {
              tagOverrides: newOverrides,
              isAnalyzingBpm: false,
              statusMessage: `BPM: ${bpm}`
          });
      } else {
          this.updateFileItem(item, { isAnalyzingBpm: false, statusMessage: 'BPM detection failed.' });
      }
  }

  async downloadFile(item: ProcessedFile) {
      if (!item.selectedRelease || !item.selectedTrack) return;

      this.updateFileItem(item, { status: 'searching', statusMessage: 'Writing tags...' });

      // Prefer releaseDetails (from API detail call) over selectedRelease (from search)
      const release = item.releaseDetails || item.selectedRelease;
      const track = item.selectedTrack;

      // Build genre: prefer styles (more specific), fallback to genres
      let genre: string[] = [];
      if (release.styles && release.styles.length > 0) {
          genre = release.styles;
      } else if (release.genres && release.genres.length > 0) {
          genre = release.genres;
      }

      // Get label
      const label = release.labels?.[0]?.name;

      // Determinar el artista: priorizar manual/detectado > release > track
      // El artista del track específico solo se usa si no hay otra opción
      // (ej: "Hector Seral" es el artista de la versión, pero queremos "HS2")
      const artistFromRelease = this.normalizeSuperscripts(release.artist || '').replace(/\*+$/, '').trim();
      const detectedArtist = item.manualArtist || '';
      const finalArtist = detectedArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';

      const finalTags: Mp3Tags = {
          title: track.title,
          artist: finalArtist,
          album: release.title,
          year: release.year ? parseInt(String(release.year)) : undefined,
          genre: genre.length > 0 ? genre : undefined,
          label: label,
          albumArtist: artistFromRelease || release.artist,
          trackNumber: undefined,
          bpm: item.tagOverrides?.bpm || item.currentTags?.bpm,
          ...item.tagOverrides
      };

      // Parse track number from position (e.g., "A1", "1", "1-1")
      if (track.position) {
          const pos = track.position;
          const num = parseInt(pos.replace(/\D+/g, ''));
          if (!isNaN(num) && num > 0) finalTags.trackNumber = num;
      }

      // Try to fetch cover image from Discogs (using authenticated request to bypass CORS)
      if (release.cover_image && !finalTags.image) {
          const coverBlob = await this.discogs.fetchCoverImage(release.cover_image);
          if (coverBlob) {
              finalTags.image = coverBlob;
          }
      }

      try {
          const blob = await this.processor.writeTags(item.file, finalTags);
          const cleanName = this.processor.sanitizeFileName(`${finalTags.artist} - ${finalTags.title}`);
          saveAs(blob, `${cleanName}.mp3`);
          this.updateFileItem(item, { status: 'done', statusMessage: 'Download started.' });
      } catch (e) {
          this.updateFileItem(item, { status: 'error', statusMessage: 'Failed to write tags.' });
      }
  }

  removeFile(index: number) {
      this.files.update(current => current.filter((_, i) => i !== index));
  }

  updateFileItem(item: ProcessedFile, changes: Partial<ProcessedFile>) {
    this.files.update(current =>
      current.map(f => f.originalName === item.originalName ? { ...f, ...changes } : f)
    );
  }

  updateArtist(item: ProcessedFile, artist: string) {
    this.updateFileItem(item, { manualArtist: artist });
  }

  updateTitle(item: ProcessedFile, title: string) {
    this.updateFileItem(item, { manualTitle: title });
  }

  // --- Bulk Actions ---

  autoProcessAll() {
      // Trigger search for all pending items
      this.filteredFiles().forEach(f => {
          if (f.status === 'pending' || f.status === 'ready') {
              this.search(f);
          }
      });
  }

  // --- Global Notification ---

  showMessage(text: string, type: 'info' | 'success' | 'error' = 'info', duration: number = 4000) {
    this.globalMessage.set({ text, type });
    if (duration > 0) {
      setTimeout(() => this.globalMessage.set(null), duration);
    }
  }

  dismissMessage() {
    this.globalMessage.set(null);
  }

  async analyzeAllBpm() {
    const files = this.filteredFiles().filter(f => !f.tagOverrides?.bpm && !f.currentTags?.bpm);

    if (files.length === 0) {
      this.showMessage('All files already have BPM data.', 'info');
      return;
    }

    this.isAnalyzingBpm.set(true);
    this.showMessage(`Analyzing BPM for ${files.length} files...`, 'info', 0);

    let completed = 0;
    let failed = 0;

    for (const f of files) {
      try {
        await this.detectBpm(f);
        completed++;
        this.showMessage(`Analyzing BPM: ${completed}/${files.length}...`, 'info', 0);
      } catch (e) {
        failed++;
        console.error('BPM detection failed for', f.originalName, e);
      }
    }

    this.isAnalyzingBpm.set(false);

    if (failed > 0) {
      this.showMessage(`BPM analysis complete: ${completed} success, ${failed} failed.`, 'error');
    } else {
      this.showMessage(`BPM analysis complete: ${completed} files processed.`, 'success');
    }
  }

  async downloadAllZip() {
    const files = this.filteredFiles().filter(f => f.selectedTrack && f.selectedRelease);

    if (files.length === 0) {
      this.showMessage('No files ready to download. Search and select tracks first.', 'error');
      return;
    }

    this.isDownloadingZip.set(true);
    this.showMessage(`Preparing ${files.length} files for download...`, 'info', 0);

    const zip = new JSZip();
    let completed = 0;
    let failed = 0;

    for (const item of files) {
      try {
        const blob = await this.prepareFileBlob(item);
        if (blob) {
          const release = item.releaseDetails || item.selectedRelease!;
          const track = item.selectedTrack!;
          const artistFromRelease = this.normalizeSuperscripts(release.artist || '').replace(/\*+$/, '').trim();
          const finalArtist = item.manualArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';
          const cleanName = this.processor.sanitizeFileName(`${finalArtist} - ${track.title}`);
          zip.file(`${cleanName}.mp3`, blob);
          completed++;
          this.showMessage(`Processing: ${completed}/${files.length}...`, 'info', 0);
        }
      } catch (e) {
        failed++;
        console.error('Failed to process', item.originalName, e);
      }
    }

    if (completed > 0) {
      this.showMessage('Generating ZIP file...', 'info', 0);
      try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const timestamp = new Date().toISOString().slice(0, 10);
        saveAs(zipBlob, `mp3-tagged-${timestamp}.zip`);
        this.showMessage(`Download started: ${completed} files in ZIP.`, 'success');
      } catch (e) {
        this.showMessage('Failed to generate ZIP file.', 'error');
      }
    } else {
      this.showMessage('No files could be processed.', 'error');
    }

    this.isDownloadingZip.set(false);
  }

  /**
   * Prepares a file blob with tags written (used for both single and batch download)
   */
  private async prepareFileBlob(item: ProcessedFile): Promise<Blob | null> {
    if (!item.selectedRelease || !item.selectedTrack) return null;

    const release = item.releaseDetails || item.selectedRelease;
    const track = item.selectedTrack;

    // Build genre
    let genre: string[] = [];
    if (release.styles && release.styles.length > 0) {
      genre = release.styles;
    } else if (release.genres && release.genres.length > 0) {
      genre = release.genres;
    }

    // Get label
    const label = release.labels?.[0]?.name;

    // Determine artist
    const artistFromRelease = this.normalizeSuperscripts(release.artist || '').replace(/\*+$/, '').trim();
    const detectedArtist = item.manualArtist || '';
    const finalArtist = detectedArtist || artistFromRelease || track.artists?.[0]?.name || 'Unknown';

    const finalTags: Mp3Tags = {
      title: track.title,
      artist: finalArtist,
      album: release.title,
      year: release.year ? parseInt(String(release.year)) : undefined,
      genre: genre.length > 0 ? genre : undefined,
      label: label,
      albumArtist: artistFromRelease || release.artist,
      trackNumber: undefined,
      bpm: item.tagOverrides?.bpm || item.currentTags?.bpm,
      ...item.tagOverrides
    };

    // Parse track number
    if (track.position) {
      const num = parseInt(track.position.replace(/\D+/g, ''));
      if (!isNaN(num) && num > 0) finalTags.trackNumber = num;
    }

    // Fetch cover image
    if (release.cover_image && !finalTags.image) {
      const coverBlob = await this.discogs.fetchCoverImage(release.cover_image);
      if (coverBlob) {
        finalTags.image = coverBlob;
      }
    }

    return this.processor.writeTags(item.file, finalTags);
  }

  clearList() {
      if (confirm('Remove all listed files?')) {
          this.files.set([]);
      }
  }

  // --- Tag Editor ---

  openEditor(item: ProcessedFile) {
      this.editingItem.set(item);
      const overrides = item.tagOverrides || {};
      const track = item.selectedTrack;
      const rel = item.releaseDetails || item.selectedRelease;

      console.log('[AppComponent] Opening editor for:', item.originalName);
      console.log('[AppComponent] tagOverrides:', overrides);

      // Helper: use override if key exists (even if undefined), otherwise use fallback
      const getVal = <T>(key: keyof Mp3Tags, ...fallbacks: (T | undefined)[]): T | undefined => {
          if (key in overrides) return overrides[key] as T | undefined;
          for (const fb of fallbacks) {
              if (fb !== undefined && fb !== null && fb !== '') return fb;
          }
          return undefined;
      };

      // Build genre from Discogs (prefer styles over genres)
      let discogsGenre: string | string[] | undefined;
      if (rel?.styles && rel.styles.length > 0) {
          discogsGenre = rel.styles;
      } else if (rel?.genres && rel.genres.length > 0) {
          discogsGenre = rel.genres;
      }

      // Parse track number from position
      let defaultTrackNum: number | undefined = item.currentTags?.trackNumber;
      if (!defaultTrackNum && track?.position) {
          const num = parseInt(track.position.replace(/\D+/g, ''));
          if (!isNaN(num) && num > 0) defaultTrackNum = num;
      }

      this.editForm.set({
          artist: getVal('artist', track?.artists?.[0]?.name, rel?.artist, item.manualArtist),
          title: getVal('title', track?.title, item.manualTitle),
          album: getVal('album', rel?.title, item.currentTags?.album),
          bpm: getVal('bpm', item.currentTags?.bpm),
          genre: getVal('genre', discogsGenre, item.currentTags?.genre),
          year: getVal('year', rel?.year ? parseInt(String(rel.year)) : undefined, item.currentTags?.year),
          label: getVal('label', rel?.labels?.[0]?.name, item.currentTags?.label),
          albumArtist: getVal('albumArtist', rel?.artist, item.currentTags?.albumArtist),
          trackNumber: getVal('trackNumber', defaultTrackNum),
          discNumber: getVal('discNumber', item.currentTags?.discNumber),
          composer: getVal('composer', item.currentTags?.composer),
          comment: getVal('comment', item.currentTags?.comment)
      });
  }

  saveEditor(newTags: Mp3Tags) {
      const item = this.editingItem();
      if (item) {
          console.log('[AppComponent] Received tags:', newTags);
          console.log('[AppComponent] Current overrides:', item.tagOverrides);

          // Replace tagOverrides entirely with the new values (not merge)
          const updatedOverrides = { ...newTags };

          console.log('[AppComponent] New overrides:', updatedOverrides);

          this.updateFileItem(item, {
              tagOverrides: updatedOverrides,
              manualArtist: newTags.artist || item.manualArtist,
              manualTitle: newTags.title || item.manualTitle,
              statusMessage: 'Tags saved.'
          });
          this.showMessage('Tags saved successfully.', 'success');
      }
      this.editingItem.set(null);
  }

  closeEditor() {
      this.editingItem.set(null);
  }
}

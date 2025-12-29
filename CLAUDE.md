# CLAUDE.md - MP3 Tag Fixer

## Project Overview

MP3 Tag Fixer is a web-based tool for automatically fixing and enriching MP3 file metadata using the Discogs music database. Built with Angular 21 using modern patterns (standalone components, signals, zoneless change detection).

## Tech Stack

- **Framework:** Angular 21.0.0 (standalone components, no NgModules)
- **Build:** Vite via Angular CLI 21.0.4
- **Language:** TypeScript 5.9.2 (strict mode)
- **State:** Angular Signals (zoneless change detection)
- **Styling:** TailwindCSS 3.4.17
- **Testing:** Vitest 4.0.8
- **Icons:** Lucide Angular

### Key Dependencies
- `browser-id3-writer` - Write ID3v2.4 tags
- `music-metadata-browser` - Read MP3 metadata
- `web-audio-beat-detector` - BPM detection
- `jszip` + `file-saver` - Batch ZIP downloads

## Commands

```bash
npm start          # Dev server on localhost:4200
npm run build      # Production build
npm test           # Run Vitest tests
npm run watch      # Dev build with watch mode
```

## Project Structure

```
src/app/
├── components/           # Standalone Angular components
│   ├── dropzone/         # File upload drag-drop zone
│   ├── file-card/        # Individual file display & controls
│   ├── filter-bar/       # Search filter + bulk actions
│   ├── tag-editor/       # Modal for editing ID3 tags
│   └── snackbar/         # Toast notifications
├── services/             # Business logic
│   ├── file-processor.service.ts   # ID3 read/write, BPM detection
│   ├── discogs.service.ts          # Discogs API integration
│   ├── search.service.ts           # Multi-strategy search engine
│   ├── track-matcher.service.ts    # Track matching algorithm
│   ├── string-utils.service.ts     # String normalization utilities
│   └── notification.service.ts     # Toast notification system
├── models/               # TypeScript interfaces
│   ├── processed-file.model.ts
│   ├── mp3-tags.model.ts
│   └── discogs.model.ts
├── store/
│   └── files.store.ts    # Central state management (Signals)
├── app.component.ts      # Root component orchestration
└── app.config.ts         # Angular configuration
```

## Architecture Patterns

### Angular 21 Patterns (MUST follow)
- **Standalone components** - No NgModules, use `standalone: true`
- **Angular Signals** - Use `signal()`, `computed()`, `effect()` for reactivity
- **New control flow** - Use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`
- **New APIs** - Use `input()`, `output()`, `model()` instead of decorators
- **Inject function** - Use `inject()` instead of constructor injection
- **Zoneless** - App uses `provideZonelessChangeDetection()`

### Service Architecture
- Services provided at root level (`providedIn: 'root'`)
- RxJS for HTTP calls, converted to Promises with `lastValueFrom()`
- Point-based scoring algorithms for search results and track matching
- Multi-strategy fallback patterns for robust searching

### State Management
- Central store in `files.store.ts` using Angular Signals
- Writable signals for state, readonly signals exposed to components
- Computed signals for derived state (filtered files, counts)

## Key Services

### FileProcessorService
- Reads ID3 tags using `music-metadata-browser`
- Writes ID3v2.4 tags using `browser-id3-writer`
- Parses filenames to extract artist/title
- Detects BPM using Web Audio API

### SearchService
- Multi-strategy search with 60+ fallback strategies
- Scoring algorithm (0-100 points) for relevance
- Rate limiting (1200ms between Discogs API calls)
- Early stopping when good results found (score >= 70)

### TrackMatcherService
- Matches files to Discogs tracklist entries
- Scoring based on title similarity, version matching, duration
- Auto-selects single matches, flags ambiguous for manual selection

### DiscogsService
- Integrates with Discogs Database API
- Searches masters and releases
- Fetches cover images via proxy (CORS bypass)

## Data Models

### ProcessedFile
```typescript
{
  file: File;
  originalName: string;
  currentTags: Mp3Tags;
  status: 'pending' | 'searching' | 'loading_details' | 'ready' | 'done' | 'error';
  searchResults: DiscogsRelease[];
  selectedRelease?: DiscogsRelease;
  releaseDetails?: DiscogsRelease;
  tracks: DiscogsTrack[];
  selectedTrack?: DiscogsTrack;
  manualArtist: string;
  manualTitle: string;
  tagOverrides?: Mp3Tags;
  coverImageUrl?: string;
  isAnalyzingBpm?: boolean;
}
```

### Mp3Tags
```typescript
{
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string | string[];
  trackNumber?: number;
  discNumber?: string;
  albumArtist?: string;
  label?: string;
  bpm?: number;
  composer?: string;
  image?: Blob;
  duration?: number;
  comment?: string;
}
```

## Code Conventions

### Naming
- Services: `*.service.ts`
- Components: `*.component.ts`
- Models: `*.model.ts`
- Store: `*.store.ts`
- Private fields: `_fieldName` prefix

### Styling
- Use TailwindCSS utility classes
- Responsive: use `md:` breakpoints for mobile support
- Custom animations defined in `styles.css`

### Error Handling
- Try-catch blocks for file operations
- Console logging with prefixes: `[ServiceName]`
- User-facing errors via NotificationService

## Application Workflow

1. User uploads MP3 files (drag-drop or file input)
2. App reads existing ID3 tags and parses filename
3. SearchService executes multi-strategy search against Discogs API
4. User selects release, app fetches full tracklist
5. TrackMatcherService auto-matches file to best track
6. User can edit tags in modal, detect BPM, add overrides
7. Download file with complete ID3v2.4 tags or batch as ZIP

## API Integration

### Discogs API
- Base URL: `https://api.discogs.com`
- Authentication: Consumer Key/Secret in headers
- Cover images proxied via `/discogs-images/*` (see `proxy.conf.json`)
- Rate limit: Must wait 1200ms between requests

## Testing

- Framework: Vitest
- Run: `npm test`
- Test files: `*.spec.ts` alongside source files

## Important Notes

- This app runs entirely in the browser (no backend)
- Audio files are processed client-side using Web APIs
- CORS proxy required for Discogs cover images
- Bundle size budget: max 1MB initial, max 8kB per component style

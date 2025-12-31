# CLAUDE.md - MP3 Tag Fixer

## Project Overview

MP3 Tag Fixer is a full-stack web application for automatically fixing and enriching MP3 file metadata using the Discogs music database. The frontend is built with Angular 21 using modern patterns (standalone components, signals, zoneless change detection), while the backend is powered by NestJS with PostgreSQL for persistent storage, user authentication via Clerk, and Stripe for payment processing.

## Tech Stack

### Frontend
- **Framework:** Angular 21.0.0 (standalone components, no NgModules)
- **Build:** Vite via Angular CLI 21.0.4
- **Language:** TypeScript 5.9.2 (strict mode)
- **State:** Angular Signals (zoneless change detection)
- **Styling:** TailwindCSS 3.4.17
- **Testing:** Vitest 4.0.8
- **Icons:** Lucide Angular

#### Key Frontend Dependencies
- `browser-id3-writer` - Write ID3v2.4 tags
- `music-metadata-browser` - Read MP3 metadata
- `web-audio-beat-detector` - BPM detection
- `jszip` + `file-saver` - Batch ZIP downloads

### Backend
- **Framework:** NestJS 11.0.1
- **Database:** PostgreSQL 16 (Alpine)
- **ORM:** Prisma 5.22.0
- **Authentication:** Clerk (@clerk/backend 2.29.0)
- **Payments:** Stripe 20.1.0
- **Language:** TypeScript 5.7.3 (strict mode)
- **Testing:** Jest 30.0.0
- **Containerization:** Docker Compose

#### Key Backend Dependencies
- `music-metadata` - Server-side MP3 metadata reading
- `node-id3` - Server-side ID3 tag writing
- `multer` - File upload handling
- `class-validator` + `class-transformer` - DTO validation

## Commands

### Frontend (root directory)
```bash
npm start          # Dev server on localhost:4200
npm run build      # Production build
npm test           # Run Vitest tests
npm run watch      # Dev build with watch mode
```

### Backend (api/ directory)
```bash
npm run start:dev      # Development server with hot reload
npm run start:prod     # Production server
npm run build          # Build for production
npm test               # Run Jest tests
npm run test:e2e       # Run E2E tests
npm run lint           # Run ESLint

# Database commands
npm run db:generate    # Generate Prisma Client
npm run db:migrate     # Run migrations
npm run db:push        # Push schema to database
npm run db:studio      # Open Prisma Studio

# Docker commands
npm run docker:up      # Start PostgreSQL container
npm run docker:down    # Stop PostgreSQL container
```

## Project Structure

### Frontend Structure
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

### Backend Structure
```
api/
├── src/
│   ├── auth/                      # Authentication module (Clerk)
│   │   ├── guards/
│   │   │   └── clerk-auth.guard.ts    # JWT validation guard
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── clerk.service.ts       # Clerk integration
│   │   └── auth.module.ts
│   ├── users/                     # User management module
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   ├── files/                     # File processing module
│   │   ├── files.service.ts       # ID3 read/write operations
│   │   ├── files.controller.ts    # File upload & download endpoints
│   │   ├── dto/
│   │   │   └── write-tags.dto.ts
│   │   └── files.module.ts
│   ├── discogs/                   # Discogs API integration
│   │   ├── discogs.service.ts     # Discogs API wrapper
│   │   ├── search.service.ts      # Multi-strategy search
│   │   ├── string-utils.service.ts
│   │   ├── discogs.controller.ts  # Search & image proxy endpoints
│   │   ├── dto/
│   │   │   └── search.dto.ts
│   │   └── discogs.module.ts
│   ├── tracks/                    # Track persistence module
│   │   ├── tracks.service.ts      # CRUD operations
│   │   ├── tracks.controller.ts   # Track management endpoints
│   │   ├── dto/
│   │   │   ├── create-track.dto.ts
│   │   │   └── update-track.dto.ts
│   │   └── tracks.module.ts
│   ├── payments/                  # Stripe integration
│   │   ├── payments.service.ts    # Checkout & webhooks
│   │   ├── payments.controller.ts
│   │   ├── dto/
│   │   │   └── create-checkout.dto.ts
│   │   └── payments.module.ts
│   ├── prisma/                    # Database module
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   ├── app.module.ts              # Root module
│   └── main.ts                    # Application entry point
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/
├── docker-compose.yml             # PostgreSQL container config
└── package.json
```

## Architecture Patterns

### Frontend - Angular 21 Patterns (MUST follow)
- **Standalone components** - No NgModules, use `standalone: true`
- **Angular Signals** - Use `signal()`, `computed()`, `effect()` for reactivity
- **New control flow** - Use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`
- **New APIs** - Use `input()`, `output()`, `model()` instead of decorators
- **Inject function** - Use `inject()` instead of constructor injection
- **Zoneless** - App uses `provideZonelessChangeDetection()`

### Frontend - Service Architecture
- Services provided at root level (`providedIn: 'root'`)
- RxJS for HTTP calls, converted to Promises with `lastValueFrom()`
- Point-based scoring algorithms for search results and track matching
- Multi-strategy fallback patterns for robust searching

### Frontend - State Management
- Central store in `files.store.ts` using Angular Signals
- Writable signals for state, readonly signals exposed to components
- Computed signals for derived state (filtered files, counts)

### Backend - NestJS Architecture
- **Modular design** - Feature modules for auth, files, discogs, tracks, payments
- **Dependency injection** - NestJS built-in DI container
- **Global validation** - `ValidationPipe` with class-validator DTOs
- **Global exception filters** - Standard HTTP error responses
- **CORS enabled** - Configured for Angular frontend (localhost:4200)
- **Global prefix** - All routes prefixed with `/api`

### Backend - Authentication
- **Clerk integration** - JWT-based authentication
- **ClerkAuthGuard** - Validates JWT tokens on protected routes
- **@Public() decorator** - Skip auth for public endpoints (Discogs search)
- **@CurrentUser() decorator** - Inject authenticated user into controllers

### Backend - Database
- **Prisma ORM** - Type-safe database access
- **PostgreSQL 16** - Relational database via Docker
- **Migrations** - Version-controlled schema changes
- **Soft deletes** - Cascade deletion configured on relations

## Frontend Key Services

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

## Backend Key Services

### FilesService (api/src/files/)
- Reads ID3 tags using `music-metadata` library
- Writes ID3v2.4 tags using `node-id3`
- Parses filenames to extract artist/title (same logic as frontend)
- In-memory file storage with 30-minute auto-cleanup
- Sanitizes filenames for safe downloads

### DiscogsService (api/src/discogs/)
- Multi-strategy search implementation (shared with frontend logic)
- Release/master detail fetching
- Cover image proxy (bypasses CORS restrictions)
- Rate limiting (1200ms between API calls)

### TracksService (api/src/tracks/)
- CRUD operations for user tracks
- Batch operations (create many, update many)
- Track statistics (counts by status)
- Duplicate detection by file hash
- Pagination support

### PaymentsService (api/src/payments/)
- Stripe checkout session creation
- Webhook handling for subscription events
- User subscription status management

### ClerkService (api/src/auth/)
- JWT token verification
- User metadata extraction
- Integration with Clerk Backend SDK

## Database Schema

### User Model
```prisma
model User {
  id                 String              @id @default(cuid())
  email              String              @unique
  passwordHash       String?
  name               String?
  avatarUrl          String?

  // OAuth
  googleId           String?             @unique
  githubId           String?             @unique

  // Stripe
  stripeCustomerId   String?             @unique
  subscriptionStatus SubscriptionStatus  @default(FREE)
  subscriptionEndsAt DateTime?

  // Relations
  tracks             Track[]
  sessions           Session[]

  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
}

enum SubscriptionStatus {
  FREE
  ACTIVE
  CANCELED
  PAST_DUE
}
```

### Track Model
```prisma
model Track {
  id               String       @id @default(cuid())
  userId           String
  user             User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  // File info
  originalFilename String
  fileHash         String?      // For duplicate detection

  // ID3 Tags
  title            String?
  artist           String?
  album            String?
  year             Int?
  genre            String?
  bpm              Int?
  label            String?
  trackNumber      Int?
  albumArtist      String?
  composer         String?
  comment          String?

  // Discogs metadata
  discogsReleaseId Int?
  discogsTrackPos  String?
  coverImageUrl    String?
  searchQuery      String?
  searchScore      Int?

  // Status
  status           TrackStatus  @default(PENDING)
  processedAt      DateTime?

  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([userId])
  @@index([fileHash])
}

enum TrackStatus {
  PENDING
  SEARCHING
  READY
  DONE
  ERROR
}
```

### Session Model
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([token])
}
```

## API Endpoints

### Files Module (`/api/files`)
- `POST /api/files/upload` - Upload MP3 file, read tags, parse filename
- `GET /api/files/:fileId/tags` - Get tags from uploaded file
- `POST /api/files/:fileId/write-tags` - Write tags to file, return download
- `POST /api/files/:fileId/write-tags-with-cover` - Write tags + cover image
- `DELETE /api/files/:fileId` - Delete uploaded file from memory

### Discogs Module (`/api/discogs`) - Public endpoints
- `GET /api/discogs/search/smart` - Multi-strategy smart search
- `GET /api/discogs/search/release` - Search by artist + release
- `GET /api/discogs/search/track` - Search by track name
- `GET /api/discogs/search` - General query search
- `GET /api/discogs/release/:id` - Get release details
- `GET /api/discogs/master/:id` - Get master details
- `GET /api/discogs/image?url=...` - Proxy cover images (CORS bypass)

### Tracks Module (`/api/tracks`) - Protected endpoints
- `POST /api/tracks` - Create track
- `POST /api/tracks/batch` - Create multiple tracks
- `GET /api/tracks` - Get all user tracks (with pagination, filters)
- `GET /api/tracks/stats` - Get track statistics
- `GET /api/tracks/duplicates/:fileHash` - Check for duplicates
- `GET /api/tracks/:id` - Get single track
- `PATCH /api/tracks/:id` - Update track
- `PATCH /api/tracks/:id/mark-processed` - Mark as processed
- `PATCH /api/tracks/batch/status` - Batch update status
- `DELETE /api/tracks/:id` - Delete track

### Payments Module (`/api/payments`) - Protected endpoints
- `POST /api/payments/create-checkout` - Create Stripe checkout session
- `POST /api/payments/webhook` - Stripe webhook handler (public)

## Frontend Data Models

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
  image?: Blob;      // Frontend: Blob
  duration?: number;
  comment?: string;
}
```

## Code Conventions

### Frontend Naming
- Services: `*.service.ts`
- Components: `*.component.ts`
- Models: `*.model.ts`
- Store: `*.store.ts`
- Private fields: `_fieldName` prefix

### Backend Naming
- Services: `*.service.ts`
- Controllers: `*.controller.ts`
- Modules: `*.module.ts`
- DTOs: `*.dto.ts`
- Guards: `*.guard.ts`
- Decorators: `*.decorator.ts`

### Styling
- Use TailwindCSS utility classes
- Responsive: use `md:` breakpoints for mobile support
- Custom animations defined in `styles.css`

### Error Handling

#### Frontend
- Try-catch blocks for file operations
- Console logging with prefixes: `[ServiceName]`
- User-facing errors via NotificationService

#### Backend
- NestJS built-in exception filters
- `BadRequestException`, `NotFoundException`, `UnauthorizedException`
- Console logging with prefixes: `[ServiceName]`
- Custom error messages for validation failures

## Application Workflow

### Client-Only Workflow (Original)
1. User uploads MP3 files (drag-drop or file input)
2. App reads existing ID3 tags and parses filename (client-side)
3. SearchService executes multi-strategy search against Discogs API
4. User selects release, app fetches full tracklist
5. TrackMatcherService auto-matches file to best track
6. User can edit tags in modal, detect BPM, add overrides
7. Download file with complete ID3v2.4 tags or batch as ZIP

### Full-Stack Workflow (With Backend)
1. User uploads MP3 to backend `/api/files/upload`
2. Backend reads tags, parses filename, returns metadata
3. Frontend displays file card, triggers smart search via `/api/discogs/search/smart`
4. User selects release, backend fetches details
5. User optionally saves track to database via `/api/tracks`
6. User edits tags in modal
7. Downloads file via `/api/files/:fileId/write-tags` (server-side tag writing)
8. Track marked as processed and saved to user's library

## Environment Variables

### Frontend (.env or environment.ts)
```bash
DISCOGS_CONSUMER_KEY=your_key
DISCOGS_CONSUMER_SECRET=your_secret
API_URL=http://localhost:3000/api  # Backend API URL
```

### Backend (api/.env)
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mp3tagfixer"

# API
PORT=3000
FRONTEND_URL=http://localhost:4200

# Discogs API
DISCOGS_CONSUMER_KEY=your_key
DISCOGS_CONSUMER_SECRET=your_secret

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

## Discogs API Integration

### Frontend Implementation
- Base URL: `https://api.discogs.com`
- Authentication: Consumer Key/Secret in headers
- Cover images proxied via backend `/api/discogs/image`
- Rate limit: Must wait 1200ms between requests

### Backend Implementation
- Same multi-strategy search logic as frontend
- Server-side rate limiting (1200ms)
- Image proxy endpoint to bypass CORS
- Caching headers for images (24h max-age)

## Docker Setup

### PostgreSQL (docker-compose.yml)
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: mp3-tag-fixer-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mp3tagfixer
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5
```

### Start Database
```bash
cd api
npm run docker:up
npm run db:migrate
```

## Testing

### Frontend
- Framework: Vitest
- Run: `npm test`
- Test files: `*.spec.ts` alongside source files

### Backend
- Framework: Jest
- Run: `npm test` (unit tests)
- Run: `npm run test:e2e` (E2E tests)
- Test files: `*.spec.ts` (unit), `*.e2e-spec.ts` (E2E)

## Important Notes

### Architecture
- **Full-stack application** - Angular frontend + NestJS backend
- **Hybrid processing** - Client-side BPM detection, server-side tag writing
- **In-memory file storage** - Backend stores uploads for 30 minutes
- **Persistent user data** - Tracks saved to PostgreSQL database
- **Authentication** - Clerk for user management
- **Payments** - Stripe for subscription billing

### Performance
- Frontend bundle size budget: max 1MB initial, max 8kB per component style
- Backend file upload limit: 50MB per file
- Database indexes on userId, fileHash, token for fast queries
- Image caching: 24h browser cache for Discogs cover images

### Security
- CORS enabled only for configured frontend origin
- JWT validation on protected routes
- File type validation (MP3 only)
- DTO validation with whitelist/transform enabled
- Stripe webhook signature verification

### Development
- Frontend hot reload: `npm start` (root)
- Backend hot reload: `npm run start:dev` (api/)
- Database GUI: `npm run db:studio` (api/)
- Docker required for PostgreSQL (or use cloud DB)

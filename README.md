# MP3 Tag Fixer

A modern web application for automatically fixing and enriching MP3 file metadata using the Discogs music database.

![Angular](https://img.shields.io/badge/Angular-21-dd0031?logo=angular)
![NestJS](https://img.shields.io/badge/NestJS-10-e0234e?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **YouTube to MP3** - Download and tag audio directly from YouTube videos with automatic metadata
- **AI-Powered Search** - AcoustID fingerprinting + Groq LLM for intelligent track identification
- **Drag & Drop Upload** - Simply drag MP3 files into the browser
- **Automatic Tag Reading** - Extracts existing ID3 tags and parses filenames intelligently
- **Smart Search** - Multi-strategy search algorithm with 60+ fallback strategies
- **Dual Database Integration** - Search both Discogs and MusicBrainz databases
- **Track Matching** - Intelligent matching of files to tracklist entries
- **Cover Art** - Fetch and embed high-quality album artwork
- **BPM Detection** - Automatic tempo detection using Web Audio API
- **Batch Processing** - Process multiple files and download as ZIP
- **Tag Editor** - Manual editing with real-time preview
- **Theme System** - Dark/light mode with session persistence
- **Settings Modal** - Configure AI mode, debug mode, and preferences
- **Modern UI** - Premium glassmorphism design with custom component library
- **Authentication** - Secure user authentication via Clerk (Passkeys, OAuth, WebAuthn)

## Tech Stack

### Frontend

- **Framework:** Angular 21 (standalone components, signals, zoneless)
- **Design:** Glassmorphism UI with TailwindCSS
- **Build:** Vite via Angular CLI
- **Styling:** TailwindCSS
- **Testing:** Vitest

### Backend

- **Framework:** NestJS 11
- **Database:** PostgreSQL 16 with Prisma ORM
- **Auth:** Clerk (Passkeys, OAuth, WebAuthn)
- **Payments:** Stripe (subscriptions)
- **Media:** `yt-dlp` for YouTube processing

## Quick Start

### Prerequisites

- Node.js 20+
- Docker (or PostgreSQL locally)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mp3-tag-fixer.git
cd mp3-tag-fixer

# Install frontend dependencies
npm install

# Install backend dependencies
cd api
npm install
```

### Database Setup

```bash
# Option 1: Using Docker (recommended)
cd api
docker-compose up -d

# Option 2: Using Colima (lightweight Docker alternative for macOS)
brew install colima
colima start
docker-compose up -d
```

### Environment Variables

Create `api/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mp3tagfixer?schema=public"

# Clerk Auth (https://dashboard.clerk.com)
CLERK_SECRET_KEY="sk_test_..."

# Discogs API (https://www.discogs.com/settings/developers)
DISCOGS_CONSUMER_KEY="your_key"
DISCOGS_CONSUMER_SECRET="your_secret"

# Stripe (optional, for payments)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# AI Services (optional, for AI-powered search)
GROQ_API_KEY="gsk_..."                  # Groq LLM API
ACOUSTID_API_KEY="your_acoustid_key"    # AcoustID fingerprinting

# App
PORT=3000
FRONTEND_URL="http://localhost:4200"
```

### Run Migrations

```bash
cd api
npx prisma migrate dev
```

### Start Development Servers

```bash
# Terminal 1: Backend
cd api
npm run start:dev

# Terminal 2: Frontend
npm start
```

Open http://localhost:4200

## Project Structure

```
mp3-tag-fixer/
├── src/                          # Angular Frontend
│   ├── app/
│   │   ├── components/           # Standalone components
│   │   │   ├── auth/             # Authentication (Clerk)
│   │   │   ├── debug-stepper/    # Debug mode stepper
│   │   │   ├── dropzone/         # File upload zone
│   │   │   ├── file-card/        # File display & controls
│   │   │   ├── filter-bar/       # Search & bulk actions
│   │   │   ├── settings-modal/   # Settings/preferences modal
│   │   │   ├── snackbar/         # Notifications
│   │   │   ├── tag-editor/       # Modal tag editor
│   │   │   ├── ui/               # UI component library
│   │   │   │   ├── button/       # App button
│   │   │   │   ├── input/        # App input
│   │   │   │   └── modal/        # Generic modal
│   │   │   ├── youtube-input/    # YouTube URL input
│   │   │   └── youtube-modal/    # YouTube download modal
│   │   ├── services/             # Business logic
│   │   │   ├── ai-search.service.ts       # AI-powered search
│   │   │   ├── auth.service.ts            # Authentication
│   │   │   ├── discogs.service.ts         # Discogs API
│   │   │   ├── file-processor.service.ts  # ID3 read/write
│   │   │   ├── musicbrainz.service.ts     # MusicBrainz API
│   │   │   ├── search.service.ts          # Multi-strategy search
│   │   │   ├── theme.service.ts           # Theme management
│   │   │   ├── track-matcher.service.ts   # Track matching
│   │   │   └── youtube.service.ts         # YouTube downloads
│   │   ├── models/               # TypeScript interfaces
│   │   └── store/                # Signal-based state
│   └── styles.css                # Global styles
│
├── api/                          # NestJS Backend
│   ├── src/
│   │   ├── ai/                   # AI Services (AcoustID, Groq)
│   │   ├── auth/                 # Clerk authentication
│   │   ├── correction/           # Search & Tag Intelligence
│   │   ├── discogs/              # Discogs API proxy
│   │   ├── files/                # MP3 upload & processing
│   │   ├── musicbrainz/          # MusicBrainz Integration
│   │   ├── payments/             # Stripe integration
│   │   ├── tracks/               # Track history CRUD
│   │   ├── users/                # User management
│   │   ├── youtube/              # YouTube Download
│   │   ├── shared/               # Shared utilities
│   │   └── prisma/               # Database service
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   └── docker-compose.yml        # PostgreSQL container
│
├── proxy.conf.json               # Dev proxy config
└── package.json
```

## API Endpoints

### Correction & Search (Public)

```
POST  /api/correction/search             # Advanced multi-strategy search
POST  /api/correction/rank-tracks        # Rank tracks within a release
```

### Discogs (Legacy/Proxy)

```
GET  /api/discogs/release/:id              # Release details
GET  /api/discogs/image?url=               # Image proxy (CORS)
```

### Files (Auth Required)

```
POST /api/files/upload                     # Upload MP3
GET  /api/files/:id/tags                   # Read tags
POST /api/files/:id/write-tags             # Write tags
```

### Tracks (Auth Required)

```
GET    /api/tracks                         # List user tracks
POST   /api/tracks                         # Save track
GET    /api/tracks/stats                   # User statistics
PATCH  /api/tracks/:id                     # Update track
DELETE /api/tracks/:id                     # Delete track
```

### Payments (Mixed)

```
GET  /api/payments/plans                   # Available plans (public)
GET  /api/payments/status                  # Subscription status
POST /api/payments/checkout                # Create checkout session
POST /api/payments/portal                  # Customer portal
POST /api/payments/webhook                 # Stripe webhook (public)
```

## How It Works

1.  **Upload** - User drops MP3 files into the browser
2.  **Parse** - Backend (`FilenameParser`) extracts artist/title intelligence
3.  **Search** - Backend (`CorrectionService`) executes multi-strategy search against Discogs & MusicBrainz
4.  **Match** - Results are scored (0-100) and ranked by relevance
5.  **Select** - User picks a release
6.  **Auto-Match** - Backend (`rankTracks`) identifies the specific track within the release
7.  **Edit** - User can manually adjust tags, detect BPM
8.  **Download** - File is re-encoded with ID3v2.4 tags

## Search Intelligence (Backend)

The new `CorrectionModule` centralizes the search logic in the backend:

- **Strategies**: Generates 60+ search permutations (fuzzy, typo-fix, track-based, etc.)
- **Execution**: Orchestrates calls to Discogs and MusicBrainz APIs
- **Scoring**: Calculates match confidence based on:
  - String similarity (Artist/Title)
  - Metadata completeness (Year, Cover Art)
  - Format matching (Vinyl, CD, Digital)
- **Track Ranking**: selecting the best track in a release based on:
  - Position and Title matching
  - Version/Mix detection
  - Duration correlation

## Development

### Frontend Commands

```bash
npm start          # Dev server (localhost:4200)
npm run build      # Production build
npm test           # Run Vitest tests
```

### Backend Commands

```bash
cd api
npm run start:dev  # Dev server with watch
npm run build      # Production build
npx prisma studio  # Database GUI
```

### Code Style

- Angular 21 patterns: standalone components, signals, `@if`/`@for`
- NestJS modules with dependency injection
- TypeScript strict mode
- Prettier + ESLint

## Roadmap

- [x] Core tag editing functionality
- [x] Discogs integration
- [x] Backend API with NestJS
- [x] User authentication (Clerk)
- [x] Track history
- [x] Stripe payments
- [x] YouTube to MP3 Integration
- [x] AI-powered search (AcoustID + Groq LLM)
- [ ] MusicBrainz integration
- [ ] Batch processing improvements
- [x] Mobile-responsive UI/UX Redesign

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Discogs](https://www.discogs.com/) for the music database API
- [Angular](https://angular.dev/) team for the amazing framework
- [NestJS](https://nestjs.com/) for the backend framework
- [Clerk](https://clerk.com/) for authentication

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { ParseFilenameResponse } from '../dto/parse-filename.dto';

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly groq: Groq | null;
  private readonly model = 'llama-3.3-70b-versatile';

  private readonly systemPrompt = `You are a world-class expert at parsing electronic music filenames. Your job is to extract the CORRECT artist and title from messy, corrupted, or poorly formatted filenames.

## CRITICAL: ENCODING GARBAGE DETECTION

ENCODING GARBAGE looks like this - ALWAYS IGNORE IT COMPLETELY:
- Random symbols: &º(ê^ªmßG6Û¢¶{uÕþÕW»?u
- UTF-8 corruption: Ã©, Ã¡, Ã±, â€™, Ã¼
- Hex-like strings: %20, %C3%A9
- Control characters mixed with letters: pq&º(ê^
- Any sequence with: º ª ß Û ¢ ¶ { } Õ þ » ê ^ and similar non-ASCII garbage

When you see encoding garbage:
1. COMPLETELY DISCARD any "artist" that contains garbage characters
2. Look for the REAL artist/title in the CLEAN parts of the filename
3. If existing tags have garbage in artist but CLEAN title → USE THE CLEAN TITLE

## FILENAME STRUCTURE PATTERNS

Electronic music filenames typically follow these patterns:
1. "Artist - Title" (most common)
2. "Artist - Title (Remix/Mix Info)"
3. "Artist - Title [Label]"
4. "[Label] Artist - Title"
5. "01 Artist - Title" or "A1 - Artist - Title" (vinyl rips)
6. "Artist - Release Name - Track Title"
7. "Release/EP Name - Track Title" (when artist unknown)

## SUFFIX GARBAGE TO REMOVE

Always strip these suffixes (they're NOT part of the title):
- Duration patterns: -4.48, -3:45, (4:32)
- Bitrate info: -128, -320, -192, (320kbps), [FLAC]
- Random codes: -001945, -AB12CD, _final_v2
- Quality tags: [HQ], (CDQ), [Master]
- Source tags: [Beatport], [Traxsource], (Bandcamp)

## TYPO CORRECTION

Fix obvious typos while preserving legitimate words:
- Twoo → Two (but keep "Too" and "Good")
- Goood → Good (but keep "Mood" and "Food")
- Deeep → Deep (but keep "Sleep" and "Creep")
- Basse → Bass
- Houuse → House

Words with legitimate double letters (DO NOT CHANGE):
good, mood, food, cool, pool, fool, room, boom, doom, bass, mass, pass, glass,
feel, reel, steel, wheel, deep, keep, sleep, creep, free, tree, see, bee,
groove, smooth, choose, loose, soon, moon, noon, spoon

## EXISTING TAGS PRIORITY

When existing tags are provided:
1. If existing TITLE looks clean (no garbage) → TRUST IT, use it as-is
2. If existing ARTIST looks clean → TRUST IT
3. If existing ARTIST has garbage but TITLE is clean → IGNORE artist, extract from title
4. If both have garbage → Parse filename only

## ELECTRONIC MUSIC CONTEXT

Common patterns in electronic/dance music:
- "EP Part 1", "EP Parte 1", "Vol. 2" → Usually part of release name, not track title
- "Original Mix", "Club Mix", "Extended" → Version info, keep with title
- "Remix", "Dub", "VIP" → Keep with title
- "feat.", "ft.", "&", "vs" → Artist collaboration markers

## SPECIAL CASE: TITLE CONTAINS ARTIST-TITLE FORMAT

Sometimes the existing title tag already contains "Artist - Title":
- If title="Artist Name - Track Name" → Split it and use both parts
- If title="Release - Track" and no artist → artist="" and title=full string

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown, no explanation):
{"artist": "Clean Artist Name", "title": "Clean Track Title", "confidence": 0.95}

Confidence scoring:
- 0.95-1.0: Crystal clear, no ambiguity
- 0.85-0.94: Very confident, minor uncertainty
- 0.70-0.84: Good guess, some ambiguity
- 0.50-0.69: Multiple valid interpretations
- <0.50: Very uncertain

## EXAMPLES

Input: "Bases EP Parte 1 - Dynamite-pq&º(ê^ªmßG6Û¢¶{uÕþÕW»?u-002741"
Tags: artist="p q&º(ê^ ªmßG6Û¢¶{uÕþÕW»?u" title="Bases EP Parte 1 - Dynamite"
Analysis: Artist tag is GARBAGE (ignore). Title tag is CLEAN → use it!
Output: {"artist": "", "title": "Bases EP Parte 1 - Dynamite", "confidence": 0.85}

Input: "Twoo good - People are-4.48-128-001945"
Analysis: "Twoo" is typo for "Two", strip -4.48-128-001945 suffix
Output: {"artist": "Two Good", "title": "People Are", "confidence": 0.90}

Input: "[RWND001] Rewind - Deep Inside (Original Mix)"
Analysis: [RWND001] is label code, (Original Mix) is version
Output: {"artist": "Rewind", "title": "Deep Inside (Original Mix)", "confidence": 0.95}

Input: "01 - Aphex Twin - Windowlicker"
Analysis: 01 is track number
Output: {"artist": "Aphex Twin", "title": "Windowlicker", "confidence": 0.98}`;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (apiKey) {
      this.groq = new Groq({ apiKey });
      this.logger.log('Groq client initialized');
    } else {
      this.groq = null;
      this.logger.warn('GROQ_API_KEY not configured - AI parsing disabled');
    }
  }

  isAvailable(): boolean {
    return this.groq !== null;
  }

  async parseFilename(
    filename: string,
    existingArtist?: string,
    existingTitle?: string,
  ): Promise<ParseFilenameResponse> {
    if (!this.groq) {
      return this.fallbackParse(filename);
    }

    const userPrompt = this.buildUserPrompt(filename, existingArtist, existingTitle);

    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 256,
      });

      const content = completion.choices[0]?.message?.content || '';
      this.logger.debug(`Groq response: ${content}`);

      const parsed = this.parseResponse(content);

      if (parsed) {
        return {
          ...parsed,
          source: 'groq',
        };
      }

      this.logger.warn('Failed to parse Groq response, using fallback');
      return this.fallbackParse(filename);
    } catch (error) {
      this.logger.error(`Groq API error: ${error}`);
      return this.fallbackParse(filename);
    }
  }

  private buildUserPrompt(
    filename: string,
    existingArtist?: string,
    existingTitle?: string,
  ): string {
    let prompt = `FILENAME: "${filename}"`;

    if (existingArtist || existingTitle) {
      prompt += `\n\nEXISTING ID3 TAGS:`;
      prompt += `\n- Artist tag: "${existingArtist || '(empty)'}"`;
      prompt += `\n- Title tag: "${existingTitle || '(empty)'}"`;

      // Help the AI identify garbage
      const hasGarbageArtist = existingArtist && /[ºª§ß¢¶{}þÕÛê^°¨©®™]/.test(existingArtist);
      const hasGarbageTitle = existingTitle && /[ºª§ß¢¶{}þÕÛê^°¨©®™]/.test(existingTitle);

      if (hasGarbageArtist && !hasGarbageTitle) {
        prompt += `\n\n⚠️ DETECTED: Artist tag contains ENCODING GARBAGE. Title tag looks CLEAN.`;
        prompt += `\nRECOMMENDATION: Use the clean title tag, ignore garbage artist.`;
      } else if (hasGarbageArtist && hasGarbageTitle) {
        prompt += `\n\n⚠️ DETECTED: Both tags contain garbage. Parse from filename only.`;
      }
    }

    prompt += `\n\nExtract the correct artist and title. Return ONLY valid JSON.`;
    return prompt;
  }

  private parseResponse(content: string): { artist: string; title: string; confidence: number } | null {
    try {
      // Try to extract JSON from response (handle potential markdown code blocks)
      let jsonStr = content.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      }

      const parsed = JSON.parse(jsonStr);

      if (
        typeof parsed.artist === 'string' &&
        typeof parsed.title === 'string' &&
        typeof parsed.confidence === 'number'
      ) {
        return {
          artist: parsed.artist.trim(),
          title: parsed.title.trim(),
          confidence: Math.min(1, Math.max(0, parsed.confidence)),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private fallbackParse(filename: string): ParseFilenameResponse {
    // Enhanced fallback parser when Groq is unavailable
    let base = filename.replace(/\.(mp3|wav|flac|m4a|ogg)$/i, '');

    // Remove common suffixes (duration, bitrate, codes)
    base = base
      .replace(/-\d+\.\d+-\d+-\d+$/, '') // -4.48-128-001945
      .replace(/-\d{6,}$/, '') // -001945
      .replace(/-\d{2,3}$/, '') // -128, -320
      .replace(/\s*\[\w+\]\s*$/, '') // [HQ], [FLAC]
      .replace(/\s*\(\d+kbps?\)\s*$/i, '') // (320kbps)
      .trim();

    // Remove encoding garbage
    const garbagePattern = /[ºª§ß¢¶{}þÕÛê^°¨©®™·¿¡«»×÷]+/g;

    // Try to split by " - "
    const parts = base.split(' - ');
    if (parts.length >= 2) {
      let artist = parts[0].trim();
      let title = parts.slice(1).join(' - ').trim();

      // Check if artist is garbage
      if (garbagePattern.test(artist) || artist.length < 2) {
        // Artist looks like garbage, return empty artist
        return {
          artist: '',
          title: title.replace(garbagePattern, '').trim(),
          confidence: 0.4,
          source: 'fallback',
        };
      }

      // Clean title from garbage suffixes
      title = title.replace(/-[^-]*[ºª§ß¢¶{}þÕÛê^].*$/, '').trim();

      return {
        artist: artist,
        title: title,
        confidence: 0.5,
        source: 'fallback',
      };
    }

    // No separator found - clean and return as title
    return {
      artist: '',
      title: base.replace(garbagePattern, '').trim(),
      confidence: 0.3,
      source: 'fallback',
    };
  }
}

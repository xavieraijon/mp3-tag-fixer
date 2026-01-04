import { Injectable } from '@nestjs/common';
import { StringUtils } from './string-utils';

/**
 * Injectable service wrapper for StringUtils.
 * Delegates all calls to the static StringUtils class.
 *
 * Use this when you need dependency injection (e.g., for testing/mocking).
 * Use StringUtils directly when you need static access (e.g., in pure functions).
 */
@Injectable()
export class StringUtilsService {
  normalizeSuperscripts(str: string): string {
    return StringUtils.normalizeSuperscripts(str);
  }

  normalizeArtistName(artist: string): string[] {
    return StringUtils.normalizeArtistName(artist);
  }

  cleanArtistName(artist: string): string {
    return StringUtils.cleanArtistName(artist);
  }

  normalizeArtistForComparison(str: string): string {
    return StringUtils.normalizeArtistForComparison(str);
  }

  normalizeForComparison(str: string): string {
    return StringUtils.normalizeForComparison(str);
  }

  normalizeTitleForMatching(str: string): string {
    return StringUtils.normalizeTitleForMatching(str);
  }

  extractParenthesisInfo(title: string): {
    base: string;
    mixInfo: string;
    full: string;
  } {
    return StringUtils.extractParenthesisInfo(title);
  }

  stripParentheses(str: string): string {
    return StringUtils.stripParentheses(str);
  }

  normalizeTitleForSearch(title: string): string[] {
    return StringUtils.normalizeTitleForSearch(title);
  }

  calculateStringSimilarity(str1: string, str2: string): number {
    return StringUtils.calculateStringSimilarity(str1, str2);
  }

  looksLikeFilename(tag: string): boolean {
    return StringUtils.looksLikeFilename(tag);
  }

  isValidTag(tag: string | undefined): boolean {
    return StringUtils.isValidTag(tag);
  }

  fixRepeatedLetters(str: string): string[] {
    return StringUtils.fixRepeatedLetters(str);
  }

  generateFuzzyVariants(str: string): string[] {
    return StringUtils.generateFuzzyVariants(str);
  }

  generateCompoundVariants(str: string): string[] {
    return StringUtils.generateCompoundVariants(str);
  }

  capitalizeFirst(s: string): string {
    return StringUtils.capitalizeFirst(s);
  }

  normalizeStrict(text: string): string {
    return StringUtils.normalizeStrict(text);
  }

  generateNormalizedKey(artist: string, title: string): string | null {
    return StringUtils.generateNormalizedKey(artist, title);
  }
}

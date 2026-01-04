import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly STORAGE_KEY = 'mp3-tag-fixer-theme';

  private readonly _preference = signal<Theme>(this.getInitialPreference());
  readonly preference = this._preference.asReadonly();

  private readonly _resolvedTheme = signal<'light' | 'dark'>(
    this.resolveTheme(this._preference())
  );
  readonly resolvedTheme = this._resolvedTheme.asReadonly();

  readonly isDark = () => this._resolvedTheme() === 'dark';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.applyTheme(this._resolvedTheme());

      effect(() => {
        const pref = this._preference();
        const resolved = this.resolveTheme(pref);
        this._resolvedTheme.set(resolved);
        this.applyTheme(resolved);
        this.persistPreference(pref);
      });

      this.listenForSystemChanges();
    }
  }

  setTheme(theme: Theme): void {
    this._preference.set(theme);
  }

  toggle(): void {
    const current = this._resolvedTheme();
    this._preference.set(current === 'dark' ? 'light' : 'dark');
  }

  private getInitialPreference(): Theme {
    if (!isPlatformBrowser(this.platformId)) return 'system';

    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
    return 'system';
  }

  private resolveTheme(pref: Theme): 'light' | 'dark' {
    if (pref === 'system') {
      if (!isPlatformBrowser(this.platformId)) return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return pref;
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  private persistPreference(pref: Theme): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.STORAGE_KEY, pref);
  }

  private listenForSystemChanges(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this._preference() === 'system') {
        const resolved = this.resolveTheme('system');
        this._resolvedTheme.set(resolved);
        this.applyTheme(resolved);
      }
    });
  }
}

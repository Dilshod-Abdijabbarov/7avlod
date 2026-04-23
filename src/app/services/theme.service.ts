import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  isDarkMode = signal<boolean>(this.getInitialTheme());

  constructor() {
    effect(() => {
      const mode = this.isDarkMode() ? 'dark' : 'light';
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.setAttribute('data-theme', mode);
        localStorage.setItem('theme', mode);
      }
    });
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
  }

  private getInitialTheme(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('theme');
      if (saved) {
        return saved === 'dark';
      }
    }
    return true; // Default to dark as it was before
  }
}

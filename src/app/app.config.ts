import { ApplicationConfig, provideZonelessChangeDetection, importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { LucideAngularModule, Music, FileUp, Search, Save, Trash2, CircleCheck, CircleAlert, LoaderCircle, Disc, Play, Info, X, Download, Pencil, Activity, Mic2, FileAudio, Check, Sparkles, ChevronRight } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    importProvidersFrom(LucideAngularModule.pick({ Music, FileUp, Search, Save, Trash2, CircleCheck, CircleAlert, LoaderCircle, Disc, Play, Info, X, Download, Pencil, Activity, Mic2, FileAudio, Check, Sparkles, ChevronRight }))
  ]
};

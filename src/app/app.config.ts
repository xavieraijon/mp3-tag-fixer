import { ApplicationConfig, provideZonelessChangeDetection, importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LucideAngularModule, Music, FileUp, Search, Save, Trash2, CircleCheck, CircleAlert, LoaderCircle, Disc, Play, Info, X, Download, Pencil, Activity, Mic2, FileAudio, Check, Sparkles, ChevronRight, User, LogIn, LogOut, UserPlus } from 'lucide-angular';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(LucideAngularModule.pick({ Music, FileUp, Search, Save, Trash2, CircleCheck, CircleAlert, LoaderCircle, Disc, Play, Info, X, Download, Pencil, Activity, Mic2, FileAudio, Check, Sparkles, ChevronRight, User, LogIn, LogOut, UserPlus }))
  ]
};

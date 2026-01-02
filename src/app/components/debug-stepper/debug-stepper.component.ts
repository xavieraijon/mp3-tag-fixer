
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DebugData } from '../../models/processed-file.model';

@Component({
  selector: 'app-debug-stepper',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="mt-3 p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-xs">
      <div class="font-semibold text-slate-500 mb-2 flex justify-between items-center">
        <span>Detection Process</span>
        <span class="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">DEBUG MODE</span>
      </div>

      <div class="space-y-2">
        @for (step of data().steps; track step.name) {
          <div class="flex items-start gap-2 relative">
            <!-- Line connector -->
            @if (!$last) {
              <div class="absolute left-2 top-4 bottom-[-8px] w-px bg-slate-200"></div>
            }

            <!-- Icon Status -->
            <div class="relative z-10 w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                [ngClass]="{
                  'bg-slate-200 text-slate-400': step.status === 'pending',
                  'bg-blue-100 text-blue-500 animate-pulse': step.status === 'running',
                  'bg-green-100 text-green-500': step.status === 'success',
                  'bg-red-100 text-red-500': step.status === 'failed',
                  'bg-slate-100 text-slate-300': step.status === 'skipped'
                }">
              @if (step.status === 'running') {
                <lucide-icon name="loader-2" class="w-3 h-3 animate-spin"></lucide-icon>
              } @else if (step.status === 'success') {
                <lucide-icon name="check" class="w-3 h-3"></lucide-icon>
              } @else if (step.status === 'failed') {
                <lucide-icon name="x" class="w-3 h-3"></lucide-icon>
              } @else if (step.status === 'skipped') {
                <lucide-icon name="minus" class="w-3 h-3"></lucide-icon>
              } @else {
                <div class="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
              }
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-center">
                <span class="font-medium" [ngClass]="{
                  'text-slate-700': step.status !== 'pending' && step.status !== 'skipped',
                  'text-slate-400': step.status === 'pending' || step.status === 'skipped'
                }">{{ step.name }}</span>

                @if (step.durationMs) {
                  <span class="text-[10px] text-slate-400 font-mono">{{ step.durationMs }}ms</span>
                }
              </div>

              @if (step.result) {
                <div class="mt-1 pl-1 border-l-2 border-slate-100">
                  <div class="text-slate-600 truncate font-medium">
                    {{ step.result.artist || 'Unknown' }} - {{ step.result.title || 'Unknown' }}
                  </div>
                  @if (step.result.confidence) {
                    <div class="text-[10px] text-slate-400">
                      Confidence: {{ (step.result.confidence * 100).toFixed(0) }}%
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: []
})
export class DebugStepperComponent {
  data = input.required<DebugData>();
}

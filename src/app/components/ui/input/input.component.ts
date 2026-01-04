import { Component, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      @if (label()) {
        <label
          [for]="id()"
          class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1"
        >
          {{ label() }}
          @if (required()) {
            <span class="text-red-500 dark:text-red-400 ml-0.5" aria-hidden="true">*</span>
            <span class="sr-only">(required)</span>
          }
        </label>
      }
      <div class="relative group">
        <input
          [type]="type()"
          [id]="id()"
          [placeholder]="placeholder()"
          [value]="value()"
          [disabled]="disabled()"
          (input)="handleInput($event)"
          class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        />
      </div>
      @if (hint()) {
        <p class="text-xs text-slate-500 dark:text-slate-400 ml-1">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class InputComponent {
  label = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');
  id = input<string>(`app-input-${Math.random().toString(36).substring(2, 9)}`);
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  hint = input<string>('');

  value = model<string | number | undefined>('');

  handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }
}

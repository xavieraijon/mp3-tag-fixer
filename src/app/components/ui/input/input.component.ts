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
      <label [for]="id()" class="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
        {{ label() }}
        @if (required()) { <span class="text-red-500 ml-0.5">*</span> }
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
          class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <!-- Optional: Add icon support later if needed -->
      </div>
      @if (hint()) {
        <p class="text-xs text-slate-400 ml-1">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class InputComponent {
  // Inputs
  label = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');
  id = input<string>(`app-input-${Math.random().toString(36).substring(2, 9)}`);
  disabled = input<boolean>(false);
  required = input<boolean>(false);
  hint = input<string>('');

  // Model
  value = model<string>('');

  handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
  }
}

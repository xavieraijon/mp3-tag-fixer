import { Component, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent } from '../ui/button/button.component';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.css'
})
export class FilterBarComponent {
  // Inputs/Models
  filterText = model<string>('');

  // Outputs
  processVisible = output<void>();
  downloadAll = output<void>();
  analyzeBpmAll = output<void>();
  clearList = output<void>();

  // Optional: Pass in count for badge?
  // We can pass it as a plain input if needed, but for now we just emit events.
}

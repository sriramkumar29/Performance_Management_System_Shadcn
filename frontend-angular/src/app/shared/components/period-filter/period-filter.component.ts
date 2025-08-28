import { Component, EventEmitter, Input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface PeriodFilterValue {
  type: 'preset' | 'custom';
  preset?: string;
  dateRange: DateRange;
  label: string;
}

interface PresetRange {
  label: string;
  value: string;
  getRange: () => DateRange;
}

@Component({
  selector: 'app-period-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule
  ],
  template: `
    <div class="period-filter">
      <button
        mat-stroked-button
        [matMenuTriggerFor]="periodMenu"
        class="flex items-center gap-2 min-w-[200px] justify-between border-border/30 hover:bg-muted/50"
        [class.bg-blue-50]="hasActiveFilter()"
        [class.border-blue-300]="hasActiveFilter()"
      >
        <div class="flex items-center gap-2">
          <mat-icon class="text-muted-foreground">date_range</mat-icon>
          <span class="text-sm font-medium">{{ currentLabel() }}</span>
        </div>
        <mat-icon class="text-muted-foreground">expand_more</mat-icon>
      </button>

      <mat-menu #periodMenu="matMenu" class="period-filter-menu">
        <!-- Preset Ranges -->
        <div class="px-4 py-2 border-b border-border/20">
          <h3 class="text-sm font-medium text-foreground mb-2">Quick Filters</h3>
          @for (preset of presetRanges; track preset.value) {
            <button
              mat-menu-item
              (click)="selectPreset(preset)"
              [class.bg-blue-50]="selectedPreset() === preset.value"
              class="w-full text-left hover:bg-muted/50"
            >
              <span class="text-sm">{{ preset.label }}</span>
            </button>
          }
        </div>

        <!-- Custom Range -->
        <div class="px-4 py-3">
          <h3 class="text-sm font-medium text-foreground mb-3">Custom Range</h3>
          <div class="space-y-3">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Start Date</mat-label>
              <input
                matInput
                [matDatepicker]="startPicker"
                [(ngModel)]="customRange.start"
                (ngModelChange)="onCustomRangeChange()"
                placeholder="Select start date"
                readonly
              >
              <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>End Date</mat-label>
              <input
                matInput
                [matDatepicker]="endPicker"
                [(ngModel)]="customRange.end"
                (ngModelChange)="onCustomRangeChange()"
                placeholder="Select end date"
                readonly
              >
              <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>

            <div class="flex gap-2">
              <button
                mat-raised-button
                color="primary"
                (click)="applyCustomRange()"
                [disabled]="!isValidCustomRange()"
                class="flex-1 text-sm"
              >
                Apply
              </button>
              <button
                mat-stroked-button
                (click)="clearFilter()"
                class="flex-1 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </mat-menu>
    </div>
  `,
  styles: [`
    .period-filter-menu {
      min-width: 320px;
    }

    .period-filter-menu .mat-mdc-menu-content {
      padding: 0;
    }

    :host ::ng-deep .mat-mdc-form-field {
      font-size: 14px;
    }

    :host ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-infix {
      min-height: 40px;
    }

    :host ::ng-deep .mat-mdc-menu-item {
      height: 36px;
      line-height: 36px;
    }
  `]
})
export class PeriodFilterComponent {
  private snackBar = inject(MatSnackBar);

  @Input() value: PeriodFilterValue | null = null;
  @Input() placeholder = 'Select Period';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<PeriodFilterValue | null>();

  selectedPreset = signal<string | null>(null);
  customRange = signal<DateRange>({ start: null, end: null });

  presetRanges: PresetRange[] = [
    {
      label: 'Last 7 days',
      value: 'last7days',
      getRange: () => ({
        start: this.subtractDays(new Date(), 7),
        end: new Date()
      })
    },
    {
      label: 'Last 30 days',
      value: 'last30days',
      getRange: () => ({
        start: this.subtractDays(new Date(), 30),
        end: new Date()
      })
    },
    {
      label: 'Last 3 months',
      value: 'last3months',
      getRange: () => ({
        start: this.subtractMonths(new Date(), 3),
        end: new Date()
      })
    },
    {
      label: 'Last 6 months',
      value: 'last6months',
      getRange: () => ({
        start: this.subtractMonths(new Date(), 6),
        end: new Date()
      })
    },
    {
      label: 'This year',
      value: 'thisyear',
      getRange: () => ({
        start: new Date(new Date().getFullYear(), 0, 1),
        end: new Date()
      })
    },
    {
      label: 'Last year',
      value: 'lastyear',
      getRange: () => {
        const lastYear = new Date().getFullYear() - 1;
        return {
          start: new Date(lastYear, 0, 1),
          end: new Date(lastYear, 11, 31)
        };
      }
    }
  ];

  currentLabel = computed(() => {
    if (!this.value) {
      return this.placeholder;
    }

    if (this.value.type === 'preset') {
      const preset = this.presetRanges.find(p => p.value === this.value?.preset);
      return preset?.label || this.placeholder;
    }

    if (this.value.type === 'custom' && this.value.dateRange.start && this.value.dateRange.end) {
      return `${this.formatDate(this.value.dateRange.start)} - ${this.formatDate(this.value.dateRange.end)}`;
    }

    return this.placeholder;
  });

  hasActiveFilter = computed(() => {
    return this.value !== null;
  });

  ngOnInit() {
    if (this.value) {
      if (this.value.type === 'preset') {
        this.selectedPreset.set(this.value.preset || null);
      } else if (this.value.type === 'custom') {
        this.customRange.set(this.value.dateRange);
      }
    }
  }

  selectPreset(preset: PresetRange) {
    this.selectedPreset.set(preset.value);
    this.customRange.set({ start: null, end: null });

    const range = preset.getRange();
    const filterValue: PeriodFilterValue = {
      type: 'preset',
      preset: preset.value,
      dateRange: range,
      label: preset.label
    };

    this.valueChange.emit(filterValue);
  }

  onCustomRangeChange() {
    this.selectedPreset.set(null);
  }

  applyCustomRange() {
    const range = this.customRange();
    
    if (!this.isValidCustomRange()) {
      this.snackBar.open('Please select valid start and end dates', 'Close', { duration: 3000 });
      return;
    }

    if (range.start && range.end && range.start > range.end) {
      this.snackBar.open('Start date must be before end date', 'Close', { duration: 3000 });
      return;
    }

    const filterValue: PeriodFilterValue = {
      type: 'custom',
      dateRange: range,
      label: `${this.formatDate(range.start!)} - ${this.formatDate(range.end!)}`
    };

    this.valueChange.emit(filterValue);
  }

  clearFilter() {
    this.selectedPreset.set(null);
    this.customRange.set({ start: null, end: null });
    this.valueChange.emit(null);
  }

  isValidCustomRange(): boolean {
    const range = this.customRange();
    return range.start !== null && range.end !== null;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  private subtractMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() - months);
    return result;
  }
}

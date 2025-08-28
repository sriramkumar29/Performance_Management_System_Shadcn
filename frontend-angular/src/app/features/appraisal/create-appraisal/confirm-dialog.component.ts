import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  color?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon [ngClass]="data.color === 'warn' ? 'text-red-600' : 'text-slate-600'">help_outline</mat-icon>
      <span>{{ data.title || 'Confirm' }}</span>
    </h2>
    <div mat-dialog-content class="text-slate-700">
      {{ data.message }}
    </div>
    <div mat-dialog-actions class="flex justify-end gap-2">
      <button mat-button mat-dialog-close="false">{{ data.cancelText || 'Cancel' }}</button>
      <button mat-raised-button [color]="data.color || 'primary'" [mat-dialog-close]="true">
        {{ data.confirmText || 'OK' }}
      </button>
    </div>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}

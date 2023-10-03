import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

import { MultiWindowService } from './providers/multi-window.service';

@NgModule({
  imports: [CommonModule],
  providers: [
    MultiWindowService,
  ],
})
export class MultiWindowModule {}

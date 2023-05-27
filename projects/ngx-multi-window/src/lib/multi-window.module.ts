import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

import { MultiWindowService } from './providers/multi-window.service';
import { WindowRef } from './providers/window.provider';

@NgModule({
  imports: [CommonModule],
  providers: [
    MultiWindowService,
    WindowRef
  ],
})
export class MultiWindowModule {}

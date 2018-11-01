import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

import { MultiWindowService } from './providers/multi-window.service';
import { StorageService } from './providers/storage.service';
import { NGXMW_CONFIG } from './providers/config.provider';
import { MultiWindowConfig } from './types/multi-window.config';

@NgModule({
  imports: [CommonModule],
  providers: [StorageService, MultiWindowService],
})
export class MultiWindowModule {
  static forRoot(config?: MultiWindowConfig): ModuleWithProviders {
    return {
      ngModule: MultiWindowModule,
      providers: [MultiWindowService, { provide: NGXMW_CONFIG, useValue: config }],
    };
  }
}

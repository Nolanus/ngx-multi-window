import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';

import { MultiWindowService } from './providers/multi-window.service';
import { StorageService } from './providers/storage.service';
import { MultiWindowConfig } from './types/multi-window.config';

const defaultMultiWindowConfig: MultiWindowConfig = {
  keyPrefix: 'ngxmw_',
  heartbeat: 1000,
  newWindowScan: 5000,
  messageTimeout: 10000,
  windowTimeout: 15000,
};

@NgModule({
  imports: [CommonModule],
  providers: [StorageService, MultiWindowService],
})
export class MultiWindowModule {
  static forRoot(config: MultiWindowConfig = {}): ModuleWithProviders {
    return {
      ngModule: MultiWindowModule,
      providers: [MultiWindowService, {provide: 'ngxmw_config', useValue: {...defaultMultiWindowConfig, ...config}}],
    };
  }
}

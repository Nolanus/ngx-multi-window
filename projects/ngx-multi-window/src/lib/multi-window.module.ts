import { CommonModule } from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';

import {MultiWindowService} from './providers/multi-window.service';
import {StorageService} from './providers/storage.service';
import {MultiWindowConfig} from 'ngx-multi-window';

@NgModule({
    imports: [CommonModule],
    providers: [StorageService, MultiWindowService]
})
export class MultiWindowModule {
  static forRoot(config: MultiWindowConfig = null): ModuleWithProviders {
    return {
      ngModule: MultiWindowModule,
      providers: [MultiWindowService, {provide: 'config', useValue: config}]
    };
  }
}

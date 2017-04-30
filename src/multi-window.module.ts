import {CommonModule} from '@angular/common';
import {NgModule, ModuleWithProviders} from '@angular/core';

import {MultiWindowService} from './multi-window.service';
import {StorageService} from './storage.service';

@NgModule({
    imports: [CommonModule],
    providers: [StorageService]
})
export class MultiWindowModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: MultiWindowModule,
            providers: [MultiWindowService]
        };
    }
}

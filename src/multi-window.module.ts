import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { MultiWindowServiceProvider } from './multi-window.service';
import { StorageServiceProvider } from './storage.service';

@NgModule({
    imports: [CommonModule],
    providers: [StorageServiceProvider, MultiWindowServiceProvider]
})
export class MultiWindowModule {
}

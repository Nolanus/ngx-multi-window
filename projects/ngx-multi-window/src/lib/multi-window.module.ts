import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { MultiWindowServiceProvider } from './providers/multi-window.service';
import { StorageServiceProvider } from './providers/storage.service';

@NgModule({
    imports: [CommonModule],
    providers: [StorageServiceProvider, MultiWindowServiceProvider]
})
export class MultiWindowModule {
}

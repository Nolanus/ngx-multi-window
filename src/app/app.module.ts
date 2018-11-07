import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MultiWindowConfig, MultiWindowModule, NameSafeStrategy } from 'ngx-multi-window';

const config: MultiWindowConfig = {nameSafeStrategy: NameSafeStrategy.SAVE_WHEN_EMPTY};

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    MultiWindowModule.forRoot(config),
  ],
  providers: [Location, {provide: LocationStrategy, useClass: PathLocationStrategy}],
  bootstrap: [AppComponent],
})
export class AppModule {
}

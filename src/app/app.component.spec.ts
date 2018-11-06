import {TestBed, async} from '@angular/core/testing';
import {AppComponent} from './app.component';
import {NGXMW_CONFIG} from 'ngx-multi-window';
import {FormsModule} from '@angular/forms';

const multiWindowConfig = {
  heartbeat: 1000,
  newWindowScan: 1000,
};

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
      ],
      providers: [
        {provide: NGXMW_CONFIG, useValue: multiWindowConfig},
      ],
      imports: [
        FormsModule,
      ],
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });
});

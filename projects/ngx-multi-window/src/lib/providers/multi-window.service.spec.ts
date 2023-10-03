import { TestBed } from '@angular/core/testing';

import { MultiWindowService } from './multi-window.service';

describe('NgxMultiWindowService', () => {
  let service: MultiWindowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MultiWindowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

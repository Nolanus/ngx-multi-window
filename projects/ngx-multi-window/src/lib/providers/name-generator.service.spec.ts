import { TestBed } from '@angular/core/testing';

import { NameGeneratorService } from './name-generator.service';

describe('NameGeneratorService', () => {
  let service: NameGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NameGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

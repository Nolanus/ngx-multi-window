import { TestBed, inject } from '@angular/core/testing';

import { NameGeneratorService } from './name-generator.service';

describe('NameGeneratorService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NameGeneratorService]
    });
  });

  it('should be created', inject([NameGeneratorService], (service: NameGeneratorService) => {
    expect(service).toBeTruthy();
  }));
});

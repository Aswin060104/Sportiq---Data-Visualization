import { TestBed } from '@angular/core/testing';
import { CouchDbService } from './couchdb.service';

describe('CouchdbService', () => {
  let service: CouchDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CouchDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CoachsService } from './coachs.service';

describe('CoachsService', () => {
  let service: CoachsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoachsService],
    }).compile();

    service = module.get<CoachsService>(CoachsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

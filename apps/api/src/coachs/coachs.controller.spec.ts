import { Test, TestingModule } from '@nestjs/testing';
import { CoachsController } from './coachs.controller';
import { CoachsService } from './coachs.service';

describe('CoachsController', () => {
  let controller: CoachsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoachsController],
      providers: [CoachsService],
    }).compile();

    controller = module.get<CoachsController>(CoachsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

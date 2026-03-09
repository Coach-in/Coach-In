import { Module } from '@nestjs/common';
import { CoachsService } from './coachs.service';
import { CoachsController } from './coachs.controller';

@Module({
  controllers: [CoachsController],
  providers: [CoachsService],
})
export class CoachsModule {}

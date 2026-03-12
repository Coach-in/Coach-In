import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachDocumentsService } from './coach-documents.service';
import { CoachDocumentsController } from './coach-documents.controller';
import { CoachDocument } from './entities/coach-document.entity';
import { Coach } from '../coachs/entities/coach.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CoachDocument, Coach])],
  controllers: [CoachDocumentsController],
  providers: [CoachDocumentsService],
  exports: [CoachDocumentsService],
})
export class CoachDocumentsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { Exercise } from './entities/exercise.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { ProgrammeExercise } from '../programmes/entities/programme-exercise.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exercise, Coach, Athlete, ProgrammeExercise]),
    StorageModule,
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
  exports: [ExercisesService],
})
export class ExercisesModule {}

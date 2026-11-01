import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgrammesService } from './programmes.service';
import { ProgrammesController } from './programmes.controller';
import { Programme } from './entities/programme.entity';
import { ProgrammeDay } from './entities/programme-day.entity';
import { ProgrammeExercise } from './entities/programme-exercise.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Relationship } from '../relationships/entities/relationship.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Programme,
      ProgrammeDay,
      ProgrammeExercise,
      Exercise,
      Coach,
      Athlete,
      Relationship,
      Notification,
    ]),
  ],
  controllers: [ProgrammesController],
  providers: [ProgrammesService],
})
export class ProgrammesModule {}

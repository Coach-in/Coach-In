import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelationshipsService } from './relationships.service';
import { RelationshipsController } from './relationships.controller';
import { Relationship } from './entities/relationship.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Coach } from '../coachs/entities/coach.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Relationship, Notification, Athlete, Coach]),
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
})
export class RelationshipsModule {}

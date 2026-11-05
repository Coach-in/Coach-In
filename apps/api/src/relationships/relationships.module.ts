import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelationshipsService } from './relationships.service';
import { RelationshipsController } from './relationships.controller';
import { Relationship } from './entities/relationship.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Coach } from '../coachs/entities/coach.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Relationship, Athlete, Coach]),
    NotificationsModule,
  ],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
})
export class RelationshipsModule {}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Athlete } from '../../athletes/entities/athlete.entity';
import { Coach } from '../../coachs/entities/coach.entity';

export enum RelationshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REFUSED = 'refused',
}

@Entity()
export class Relationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Athlete, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'athlete_id' })
  athlete: Athlete;

  @ManyToOne(() => Coach, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coach_id' })
  coach: Coach;

  @Column({ type: 'enum', enum: RelationshipStatus, default: RelationshipStatus.PENDING })
  status: RelationshipStatus;

  @CreateDateColumn()
  createdAt: Date;
}


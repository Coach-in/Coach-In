import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  RelationId,
} from 'typeorm';
import { Coach } from '../../coachs/entities/coach.entity';
import { Athlete } from '../../athletes/entities/athlete.entity';

@Entity()
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  s3Key?: string;

  // Creator when it is a coach. Both creators null = built-in exercise
  @ManyToOne(() => Coach, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: Coach | null;

  // Exposes the creator without loading the coach (and its user) relation
  @RelationId((exercise: Exercise) => exercise.createdBy)
  createdById?: string | null;

  // Creator when it is an athlete
  @ManyToOne(() => Athlete, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_athlete' })
  createdByAthlete?: Athlete | null;

  @RelationId((exercise: Exercise) => exercise.createdByAthlete)
  createdByAthleteId?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

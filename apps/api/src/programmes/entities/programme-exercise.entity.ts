import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { ProgrammeDay } from './programme-day.entity';

@Entity()
export class ProgrammeExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProgrammeDay, (day) => day.exercises, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'day_id' })
  day: Relation<ProgrammeDay>;

  // RESTRICT: a catalogue exercise cannot be deleted while a programme uses it
  @ManyToOne(() => Exercise, {
    eager: true,
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'int' })
  sets: number;

  @Column({ type: 'int' })
  reps: number;

  @Column({ type: 'float', nullable: true })
  weight?: number;

  @Column({ type: 'float', nullable: true })
  rpe?: number;

  @Column({ type: 'int', nullable: true })
  restSeconds?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}

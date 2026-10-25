import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Programme } from './programme.entity';
import { ProgrammeExercise } from './programme-exercise.entity';

@Entity()
@Unique(['programme', 'dayIndex'])
export class ProgrammeDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relation<> avoids the circular import being evaluated by decorator metadata
  @ManyToOne(() => Programme, (programme) => programme.days, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'programme_id' })
  programme: Relation<Programme>;

  // 1-based offset from programme.startDate
  @Column({ type: 'int' })
  dayIndex: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => ProgrammeExercise, (exercise) => exercise.day, {
    cascade: ['insert', 'update'],
  })
  exercises: ProgrammeExercise[];
}

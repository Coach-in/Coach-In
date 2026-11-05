import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Coach } from '../../coachs/entities/coach.entity';
import { Athlete } from '../../athletes/entities/athlete.entity';
import { ProgrammeDay } from './programme-day.entity';

@Entity()
export class Programme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Owner when set. null = athlete-owned programme (the athlete is the owner)
  @ManyToOne(() => Coach, {
    eager: true,
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'coach_id' })
  coach: Coach | null;

  // Assignee. null = coach template, not assigned to any athlete yet
  @ManyToOne(() => Athlete, {
    eager: true,
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'athlete_id' })
  athlete: Athlete | null;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  objectives?: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @OneToMany(() => ProgrammeDay, (day) => day.programme, {
    cascade: ['insert', 'update'],
  })
  days: ProgrammeDay[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

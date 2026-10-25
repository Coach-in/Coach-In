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

  // null = built-in exercise available to every coach
  @ManyToOne(() => Coach, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: Coach | null;

  // Exposes the creator without loading the coach (and its user) relation
  @RelationId((exercise: Exercise) => exercise.createdBy)
  createdById?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

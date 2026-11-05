import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Coach } from '../../coachs/entities/coach.entity';

@Entity()
export class CoachDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Coach, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coach_id' })
  coach: Coach;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  s3Key: string;

  @CreateDateColumn()
  uploadedAt: Date;
}

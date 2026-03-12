import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Tag } from '../../tags/entities/tag.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Athlete {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  age: number;

  @Column({ nullable: true })
  goals?: string;

  @ManyToMany(() => Tag, { eager: true })
  @JoinTable({ name: 'athlete_tags' })
  tags: Tag[];
}

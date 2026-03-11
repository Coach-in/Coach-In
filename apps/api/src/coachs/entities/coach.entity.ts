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
export class Coach {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  specialty: string;

  @Column({ nullable: true })
  bio?: string;

  @ManyToMany(() => Tag, { eager: true })
  @JoinTable({ name: 'coach_tags' })
  tags: Tag[];
}

import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { Tag } from '../../tags/entities/tag.entity';

@Entity()
export class Coach {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  specialty: string;

  @Column({ nullable: true })
  bio?: string;

  @ManyToMany(() => Tag, { eager: true })
  @JoinTable({ name: 'coach_tags' })
  tags: Tag[];
}

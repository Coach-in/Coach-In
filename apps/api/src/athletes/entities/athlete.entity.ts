import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { Tag } from '../../tags/entities/tag.entity';

@Entity()
export class Athlete {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  age: number;

  @Column()
  sport: string;

  @Column({ nullable: true })
  level?: string;

  @Column({ nullable: true })
  goals?: string;

  @ManyToMany(() => Tag, { eager: true })
  @JoinTable({ name: 'athlete_tags' })
  tags: Tag[];
}

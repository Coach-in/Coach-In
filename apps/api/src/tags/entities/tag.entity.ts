import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @ManyToOne('TagCategory', 'tags', { nullable: true, onDelete: 'SET NULL', eager: true })
  @JoinColumn({ name: 'category_id' })
  category?: any;
}

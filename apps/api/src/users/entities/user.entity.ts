import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @Column({ default: 'athlete' })
  role: string;

  @Exclude()
  @Column({ nullable: true })
  password?: string;

  @Exclude()
  @Column({ nullable: true })
  refresh_token?: string;
}

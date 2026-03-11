import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  refresh_token?: string;
}

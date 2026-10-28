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

  // Never serialized: the global ClassSerializerInterceptor drops @Exclude()
  // fields from every response, including nested eager-loaded users.
  @Exclude()
  @Column({ nullable: true })
  password?: string;

  @Exclude()
  @Column({ nullable: true })
  refresh_token?: string;
}

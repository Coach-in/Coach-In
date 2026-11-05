import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationStatus {
  UNSEEN = 'unseen',
  SEEN = 'seen',
}

export enum NotificationType {
  GENERIC = 'generic',
  RELATIONSHIP_REQUESTED = 'relationship.requested',
  RELATIONSHIP_ACCEPTED = 'relationship.accepted',
  RELATIONSHIP_REFUSED = 'relationship.refused',
  COACH_APPROVED = 'coach.approved',
  COACH_DOCUMENT_REFUSED = 'coach.document-refused',
}

@Entity()
@Index('IDX_notification_receiver_sent_at', ['receiver', 'sentAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  message: string;

  @Column({ type: 'varchar', default: NotificationType.GENERIC })
  type: NotificationType;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  link: string | null;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNSEEN,
  })
  status: NotificationStatus;

  @Column({ type: 'timestamp', precision: 3, nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', precision: 3 })
  sentAt: Date;

  @Index()
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;
}

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Relationship,
  RelationshipStatus,
} from './entities/relationship.entity';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { AuthUser } from '../auth/auth.types';

@Injectable()
export class RelationshipsService {
  private readonly logger = new Logger(RelationshipsService.name);

  constructor(
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
    @InjectRepository(Athlete)
    private readonly athleteRepository: Repository<Athlete>,
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    dto: CreateRelationshipDto,
    requester: AuthUser,
  ): Promise<Relationship> {
    this.logger.debug(
      `[create] Athlete ${dto.athleteId} requesting relationship with Coach ${dto.coachId}`,
    );

    const athlete = await this.athleteRepository.findOne({
      where: { id: dto.athleteId },
    });
    if (!athlete) {
      this.logger.warn(`[create] Athlete #${dto.athleteId} not found`);
      throw new NotFoundException(`Athlete #${dto.athleteId} not found`);
    }
    if (athlete.user?.id !== requester.id) {
      throw new ForbiddenException(
        'You can only request a relationship for your own athlete profile',
      );
    }

    const coach = await this.coachRepository.findOne({
      where: { id: dto.coachId },
    });
    if (!coach) {
      this.logger.warn(`[create] Coach #${dto.coachId} not found`);
      throw new NotFoundException(`Coach #${dto.coachId} not found`);
    }
    if (!coach.isApproved) {
      throw new BadRequestException('Coach is not approved yet');
    }

    const existing = await this.relationshipRepository.findOne({
      where: {
        athlete: { id: athlete.id },
        coach: { id: coach.id },
        status: In([RelationshipStatus.PENDING, RelationshipStatus.ACCEPTED]),
      },
    });
    if (existing) {
      throw new ConflictException(
        `A ${existing.status} relationship already exists with this coach`,
      );
    }

    const { saved, notification } =
      await this.relationshipRepository.manager.transaction(async (manager) => {
        const relationship = await manager.getRepository(Relationship).save(
          manager.getRepository(Relationship).create({
            athlete,
            coach,
            status: RelationshipStatus.PENDING,
          }),
        );
        const created = await this.notificationsService.create(
          {
            type: NotificationType.RELATIONSHIP_REQUESTED,
            message: `${athlete.user.username} souhaite être coaché par vous.`,
            sender: athlete.user,
            receiver: coach.user,
            data: {
              relationshipId: relationship.id,
              athleteId: athlete.id,
              athleteName: athlete.user.username,
            },
            link: `/relationships/${relationship.id}`,
          },
          manager,
        );
        return { saved: relationship, notification: created };
      });
    this.notificationsService.publish(notification);
    this.logger.log(`[create] Relationship created with id=${saved.id}`);

    return this.findOne(saved.id);
  }

  async findAll(userId: string): Promise<Relationship[]> {
    this.logger.debug(`[findAll] Fetching relationships for userId=${userId}`);
    const relationships = await this.relationshipRepository.find({
      where: [
        { athlete: { user: { id: userId } } },
        { coach: { user: { id: userId } } },
      ],
    });
    this.logger.debug(
      `[findAll] Found ${relationships.length} relationship(s) for userId=${userId}`,
    );
    return relationships;
  }

  async accept(id: string, requester: AuthUser): Promise<Relationship> {
    this.logger.debug(`[accept] Accepting relationship id=${id}`);
    return this.answer(
      id,
      requester,
      RelationshipStatus.ACCEPTED,
      NotificationType.RELATIONSHIP_ACCEPTED,
      'a accepté votre demande de coaching.',
    );
  }

  async refuse(id: string, requester: AuthUser): Promise<Relationship> {
    this.logger.debug(`[refuse] Refusing relationship id=${id}`);
    return this.answer(
      id,
      requester,
      RelationshipStatus.REFUSED,
      NotificationType.RELATIONSHIP_REFUSED,
      'a refusé votre demande de coaching.',
    );
  }

  private async answer(
    id: string,
    requester: AuthUser,
    status: RelationshipStatus,
    notificationType: NotificationType,
    messageSuffix: string,
  ): Promise<Relationship> {
    const relationship = await this.findOne(id);
    if (relationship.coach.user?.id !== requester.id) {
      throw new ForbiddenException(
        'Only the coach of this relationship can answer the request',
      );
    }
    if (relationship.status !== RelationshipStatus.PENDING) {
      throw new ConflictException(
        `Relationship is already ${relationship.status}`,
      );
    }

    const notification = await this.relationshipRepository.manager.transaction(
      async (manager) => {
        relationship.status = status;
        await manager.getRepository(Relationship).save(relationship);
        await this.notificationsService.markRelationshipRequestSeen(
          relationship.id,
          relationship.coach.user.id,
          manager,
        );
        return this.notificationsService.create(
          {
            type: notificationType,
            message: `${relationship.coach.user.username} ${messageSuffix}`,
            sender: relationship.coach.user,
            receiver: relationship.athlete.user,
            data: {
              relationshipId: relationship.id,
              coachId: relationship.coach.id,
              coachName: relationship.coach.user.username,
            },
            link: `/relationships/${relationship.id}`,
          },
          manager,
        );
      },
    );
    this.notificationsService.publish(notification);
    this.logger.log(`[answer] Relationship id=${id} is now ${status}`);

    return this.findOne(id);
  }

  private async findOne(id: string): Promise<Relationship> {
    this.logger.debug(`[findOne] Looking up relationship id=${id}`);
    const rel = await this.relationshipRepository.findOne({ where: { id } });
    if (!rel) {
      this.logger.warn(`[findOne] Relationship #${id} not found`);
      throw new NotFoundException(`Relationship #${id} not found`);
    }
    return rel;
  }
}

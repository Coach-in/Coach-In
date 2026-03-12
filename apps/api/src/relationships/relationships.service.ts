import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Relationship, RelationshipStatus } from './entities/relationship.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Coach } from '../coachs/entities/coach.entity';
import { User } from '../users/entities/user.entity';
import { CreateRelationshipDto } from './dto/create-relationship.dto';

@Injectable()
export class RelationshipsService {
  private readonly logger = new Logger(RelationshipsService.name);

  constructor(
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(Athlete)
    private readonly athleteRepository: Repository<Athlete>,
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async getUserForAthlete(athleteId: string): Promise<User> {
    const athlete = await this.athleteRepository.findOne({ where: { id: athleteId } });
    if (!athlete) throw new NotFoundException(`Athlete #${athleteId} not found`);
    const user = await this.userRepository.findOne({ where: { id: (athlete as any).user_id ?? athlete.user?.id } });
    if (!user) {
      // fallback: query by join
      const full = await this.athleteRepository
        .createQueryBuilder('athlete')
        .leftJoinAndSelect('athlete.user', 'user')
        .where('athlete.id = :id', { id: athleteId })
        .getOne();
      if (!full?.user) throw new NotFoundException(`User not found for athlete #${athleteId}`);
      return full.user;
    }
    return user;
  }

  private async getUserForCoach(coachId: string): Promise<User> {
    const coach = await this.coachRepository.findOne({ where: { id: coachId } });
    if (!coach) throw new NotFoundException(`Coach #${coachId} not found`);
    const user = await this.userRepository.findOne({ where: { id: (coach as any).user_id ?? coach.user?.id } });
    if (!user) {
      const full = await this.coachRepository
        .createQueryBuilder('coach')
        .leftJoinAndSelect('coach.user', 'user')
        .where('coach.id = :id', { id: coachId })
        .getOne();
      if (!full?.user) throw new NotFoundException(`User not found for coach #${coachId}`);
      return full.user;
    }
    return user;
  }

  async create(dto: CreateRelationshipDto): Promise<Relationship> {
    this.logger.debug(`[create] Athlete ${dto.athleteId} requesting relationship with Coach ${dto.coachId}`);

    const athlete = await this.athleteRepository.findOne({ where: { id: dto.athleteId } });
    if (!athlete) {
      this.logger.warn(`[create] Athlete #${dto.athleteId} not found`);
      throw new NotFoundException(`Athlete #${dto.athleteId} not found`);
    }

    const coach = await this.coachRepository.findOne({ where: { id: dto.coachId } });
    if (!coach) {
      this.logger.warn(`[create] Coach #${dto.coachId} not found`);
      throw new NotFoundException(`Coach #${dto.coachId} not found`);
    }

    const athleteUser = await this.getUserForAthlete(dto.athleteId);
    const coachUser = await this.getUserForCoach(dto.coachId);
    this.logger.debug(`[create] athleteUser=${athleteUser.username}, coachUser=${coachUser.username}`);

    const saved = await this.relationshipRepository.save(
      this.relationshipRepository.create({ athlete, coach, status: RelationshipStatus.PENDING }),
    );
    this.logger.log(`[create] Relationship created with id=${saved.id}`);

    const message = `${athleteUser.username} souhaite être coaché par vous.`;
    await this.notificationRepository.save(
      this.notificationRepository.create({ message, sender: athleteUser, receiver: coachUser }),
    );
    this.logger.log(`[create] Notification sent to coach user id=${coachUser.id}`);

    return this.findOne(saved.id);
  }

  async findAll(userId: string): Promise<Relationship[]> {
    this.logger.debug(`[findAll] Fetching relationships for userId=${userId}`);
    const relationships = await this.relationshipRepository
      .createQueryBuilder('relationship')
      .leftJoinAndSelect('relationship.athlete', 'athlete')
      .leftJoinAndSelect('athlete.user', 'athleteUser')
      .leftJoinAndSelect('athlete.tags', 'athleteTags')
      .leftJoinAndSelect('athleteTags.category', 'athleteTagCategory')
      .leftJoinAndSelect('relationship.coach', 'coach')
      .leftJoinAndSelect('coach.user', 'coachUser')
      .leftJoinAndSelect('coach.tags', 'coachTags')
      .leftJoinAndSelect('coachTags.category', 'coachTagCategory')
      .where('athleteUser.id = :userId', { userId })
      .orWhere('coachUser.id = :userId', { userId })
      .getMany();
    this.logger.debug(`[findAll] Found ${relationships.length} relationship(s) for userId=${userId}`);
    return relationships;
  }

  async accept(id: string): Promise<Relationship> {
    this.logger.debug(`[accept] Accepting relationship id=${id}`);
    const relationship = await this.findOne(id);
    relationship.status = RelationshipStatus.ACCEPTED;
    await this.relationshipRepository.save(relationship);
    this.logger.log(`[accept] Relationship id=${id} accepted`);

    const coachUser = await this.getUserForCoach(relationship.coach.id);
    const athleteUser = await this.getUserForAthlete(relationship.athlete.id);

    const message = `${coachUser.username} a accepté votre demande de coaching.`;
    await this.notificationRepository.save(
      this.notificationRepository.create({ message, sender: coachUser, receiver: athleteUser }),
    );
    this.logger.log(`[accept] Notification sent to athlete user id=${athleteUser.id}`);

    return this.findOne(id);
  }

  async refuse(id: string): Promise<Relationship> {
    this.logger.debug(`[refuse] Refusing relationship id=${id}`);
    const relationship = await this.findOne(id);
    relationship.status = RelationshipStatus.REFUSED;
    await this.relationshipRepository.save(relationship);
    this.logger.log(`[refuse] Relationship id=${id} refused`);

    const coachUser = await this.getUserForCoach(relationship.coach.id);
    const athleteUser = await this.getUserForAthlete(relationship.athlete.id);

    const message = `${coachUser.username} a refusé votre demande de coaching.`;
    await this.notificationRepository.save(
      this.notificationRepository.create({ message, sender: coachUser, receiver: athleteUser }),
    );
    this.logger.log(`[refuse] Notification sent to athlete user id=${athleteUser.id}`);

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




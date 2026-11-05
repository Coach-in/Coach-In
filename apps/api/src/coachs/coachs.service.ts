import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { Coach } from './entities/coach.entity';
import { TagsService } from '../tags/tags.service';
import { User } from '../users/entities/user.entity';
import { AuthUser } from '../auth/auth.types';
import { assertSelfOrAdmin } from '../auth/ownership';
import { Pagination } from '../utils/pagination';

@Injectable()
export class CoachsService {
  constructor(
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    private readonly tagsService: TagsService,
  ) {}

  async create(
    createCoachDto: CreateCoachDto,
    user?: User,
    manager?: EntityManager,
  ): Promise<Coach> {
    const repository = manager
      ? manager.getRepository(Coach)
      : this.coachRepository;
    const { tagNames, ...rest } = createCoachDto;
    const tags = tagNames ? await this.tagsService.findByNames(tagNames) : [];
    const coach = repository.create({
      ...rest,
      tags,
      ...(user && { user }),
    });
    return repository.save(coach);
  }

  async findAll(page?: Pagination): Promise<Coach[]> {
    return this.coachRepository.find({
      where: { isApproved: true },
      take: page?.limit,
      skip: page?.offset,
    });
  }

  async findOne(id: string): Promise<Coach> {
    const coach = await this.coachRepository.findOne({ where: { id } });
    if (!coach) throw new NotFoundException(`Coach #${id} not found`);
    return coach;
  }

  async findMe(userId: string): Promise<Coach> {
    const coach = await this.coachRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!coach)
      throw new NotFoundException(`Coach profile not found for user ${userId}`);
    return coach;
  }

  async update(
    id: string,
    updateCoachDto: UpdateCoachDto,
    requester: AuthUser,
  ): Promise<Coach> {
    const coach = await this.findOne(id);
    assertSelfOrAdmin(requester, coach.user?.id);
    const { tagNames, specialty, bio } = updateCoachDto;
    if (tagNames !== undefined) {
      coach.tags = await this.tagsService.findByNames(tagNames);
    }
    if (specialty !== undefined) coach.specialty = specialty;
    if (bio !== undefined) coach.bio = bio;

    return this.coachRepository.save(coach);
  }

  async remove(id: string, requester: AuthUser): Promise<void> {
    const coach = await this.findOne(id);
    assertSelfOrAdmin(requester, coach.user?.id);
    await this.coachRepository.remove(coach);
  }
}

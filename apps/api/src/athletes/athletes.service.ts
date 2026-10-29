import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';
import { Athlete } from './entities/athlete.entity';
import { TagsService } from '../tags/tags.service';
import { User } from '../users/entities/user.entity';
import { AuthUser } from '../auth/auth.types';
import { assertSelfOrAdmin } from '../auth/ownership';
import { Pagination } from '../utils/pagination';

@Injectable()
export class AthletesService {
  constructor(
    @InjectRepository(Athlete)
    private readonly athleteRepository: Repository<Athlete>,
    private readonly tagsService: TagsService,
  ) {}

  async create(
    createAthleteDto: CreateAthleteDto,
    user?: User,
    manager?: EntityManager,
  ): Promise<Athlete> {
    const repository = manager
      ? manager.getRepository(Athlete)
      : this.athleteRepository;
    const { tagNames, ...rest } = createAthleteDto;
    const tags = tagNames ? await this.tagsService.findByNames(tagNames) : [];
    const athlete = repository.create({
      ...rest,
      tags,
      ...(user && { user }),
    });
    return repository.save(athlete);
  }

  async findAll(page?: Pagination): Promise<Athlete[]> {
    return this.athleteRepository.find({
      take: page?.limit,
      skip: page?.offset,
    });
  }

  async findOne(id: string): Promise<Athlete> {
    const athlete = await this.athleteRepository.findOneBy({ id });
    if (!athlete) throw new NotFoundException(`Athlete #${id} not found`);
    return athlete;
  }

  async findOneAs(id: string, requester: AuthUser): Promise<Athlete> {
    const athlete = await this.findOne(id);
    assertSelfOrAdmin(requester, athlete.user?.id);
    return athlete;
  }

  async findMe(userId: string): Promise<Athlete> {
    const athlete = await this.athleteRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!athlete)
      throw new NotFoundException(
        `Athlete profile not found for user ${userId}`,
      );
    return athlete;
  }

  async update(
    id: string,
    updateAthleteDto: UpdateAthleteDto,
    requester: AuthUser,
  ): Promise<Athlete> {
    const athlete = await this.findOne(id);
    assertSelfOrAdmin(requester, athlete.user?.id);
    const { tagNames, age, goals } = updateAthleteDto;
    if (tagNames !== undefined) {
      athlete.tags = await this.tagsService.findByNames(tagNames);
    }
    if (age !== undefined) athlete.age = age;
    if (goals !== undefined) athlete.goals = goals;

    return this.athleteRepository.save(athlete);
  }

  async remove(id: string, requester: AuthUser): Promise<void> {
    const athlete = await this.findOne(id);
    assertSelfOrAdmin(requester, athlete.user?.id);
    await this.athleteRepository.delete(id);
  }
}

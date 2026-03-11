import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { Coach } from './entities/coach.entity';
import { TagsService } from '../tags/tags.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CoachsService {
  constructor(
    @InjectRepository(Coach)
    private readonly coachRepository: Repository<Coach>,
    private readonly tagsService: TagsService,
  ) {}

  async create(createCoachDto: CreateCoachDto, user?: User): Promise<Coach> {
    const { tagNames, ...rest } = createCoachDto;
    const tags = tagNames ? await this.tagsService.findByNames(tagNames) : [];
    const coach = this.coachRepository.create({
      ...rest,
      tags,
      ...(user && { user }),
    });
    return this.coachRepository.save(coach);
  }

  async findAll(): Promise<Coach[]> {
    return this.coachRepository.find();
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

  async update(id: string, updateCoachDto: UpdateCoachDto): Promise<Coach> {
    const coach = await this.findOne(id);
    const { tagNames, ...rest } = updateCoachDto;
    coach.tags = tagNames ? await this.tagsService.findByNames(tagNames) : [];

    return this.coachRepository.save({ ...coach, ...rest });
  }

  async remove(id: string): Promise<void> {
    const coach = await this.findOne(id);
    await this.coachRepository.remove(coach);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';
import { Athlete } from './entities/athlete.entity';
import { TagsService } from '../tags/tags.service';
import { User } from '../users/entities/user.entity';

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
  ): Promise<Athlete> {
    const { tagNames, ...rest } = createAthleteDto;
    const tags = tagNames ? await this.tagsService.findByNames(tagNames) : [];
    const athlete = this.athleteRepository.create({
      ...rest,
      tags,
      ...(user && { user }),
    });
    return this.athleteRepository.save(athlete);
  }

  async findAll(): Promise<Athlete[]> {
    return this.athleteRepository.find();
  }

  async findOne(id: string): Promise<Athlete> {
    const athlete = await this.athleteRepository.findOneBy({ id });
    if (!athlete) throw new NotFoundException(`Athlete #${id} not found`);
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
  ): Promise<Athlete> {
    const athlete = await this.findOne(id);
    const { tagNames, ...rest } = updateAthleteDto;
    athlete.tags = tagNames ? await this.tagsService.findByNames(tagNames) : [];

    return this.athleteRepository.save({ ...athlete, ...rest });
  }

  async remove(id: string): Promise<void> {
    await this.athleteRepository.delete(id);
  }
}

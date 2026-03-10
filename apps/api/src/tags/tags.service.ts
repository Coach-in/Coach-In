import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagCategoriesService } from './tag-categories.service';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly tagCategoriesService: TagCategoriesService,
  ) {}

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const { categoryName, ...rest } = createTagDto;
    const category = categoryName ? await this.tagCategoriesService.findByName(categoryName) : undefined;
    return this.tagRepository.save({ ...rest, category });
  }

  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find();
  }

  async findOne(id: string): Promise<Tag> {
    const tag = await this.tagRepository.findOne({ where: { id } });
    if (!tag) throw new NotFoundException(`Tag #${id} not found`);
    return tag;
  }

  async findByNames(names: string[]): Promise<Tag[]> {
    return this.tagRepository.find({ where: { name: In(names) } });
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagRepository.remove(tag);
  }
}






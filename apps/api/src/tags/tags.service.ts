import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const category = categoryName
      ? await this.tagCategoriesService.findByName(categoryName)
      : undefined;
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
    return this.tagRepository
      .createQueryBuilder('tag')
      .leftJoinAndSelect('tag.category', 'category')
      .where('LOWER(tag.name) IN (:...names)', {
        names: names.map((n) => n.toLowerCase()),
      })
      .getMany();
  }

  async findOrCreateByNames(names: string[]): Promise<Tag[]> {
    const existing = await this.findByNames(names);
    const existingNamesLower = existing.map((t) => t.name.toLowerCase());
    const missing = names.filter(
      (n) => !existingNamesLower.includes(n.toLowerCase()),
    );
    const created = await Promise.all(
      missing.map((name) => this.tagRepository.save({ name })),
    );
    return [...existing, ...created];
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagRepository.remove(tag);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagCategory } from './entities/tag-category.entity';
import { CreateTagCategoryDto } from './dto/create-tag-category.dto';

@Injectable()
export class TagCategoriesService {
  constructor(
    @InjectRepository(TagCategory)
    private readonly tagCategoryRepository: Repository<TagCategory>,
  ) {}

  async create(dto: CreateTagCategoryDto): Promise<TagCategory> {
    return this.tagCategoryRepository.save(dto);
  }

  async findAll(): Promise<TagCategory[]> {
    return this.tagCategoryRepository.find();
  }

  async findOne(id: string): Promise<TagCategory> {
    const category = await this.tagCategoryRepository.findOneBy({ id });
    if (!category) throw new NotFoundException(`TagCategory #${id} not found`);
    return category;
  }

  async findByName(name: string): Promise<TagCategory> {
    const category = await this.tagCategoryRepository.findOneBy({ name });
    if (!category) throw new NotFoundException(`TagCategory "${name}" not found`);
    return category;
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.tagCategoryRepository.remove(category);
  }
}



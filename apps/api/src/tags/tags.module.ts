import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './entities/tag.entity';
import { TagCategory } from './entities/tag-category.entity';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { TagCategoriesService } from './tag-categories.service';
import { TagCategoriesController } from './tag-categories.controller';
import { TagsSeedService } from './tags-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, TagCategory])],
  controllers: [TagsController, TagCategoriesController],
  providers: [TagsService, TagCategoriesService, TagsSeedService],
  exports: [TagsService, TagCategoriesService],
})
export class TagsModule {}

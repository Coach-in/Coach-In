import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './entities/tag.entity';
import { TagCategory } from './entities/tag-category.entity';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { TagCategoriesService } from './tag-categories.service';
import { TagCategoriesController } from './tag-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tag, TagCategory])],
  controllers: [TagsController, TagCategoriesController],
  providers: [TagsService, TagCategoriesService],
  exports: [TagsService, TagCategoriesService],
})
export class TagsModule {}


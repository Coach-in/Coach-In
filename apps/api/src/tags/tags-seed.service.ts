import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { TagCategoriesService } from './tag-categories.service';
import { TagsService } from './tags.service';
import { TAG_SEED } from '../config/tags.config';

@Injectable()
export class TagsSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TagsSeedService.name);

  constructor(
    private readonly tagCategoriesService: TagCategoriesService,
    private readonly tagsService: TagsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existingCategories = await this.tagCategoriesService.findAll();
    const existingTags = await this.tagsService.findAll();

    if (existingCategories.length > 0 || existingTags.length > 0) {
      this.logger.log(
        'Some tags already exist, checking for missing entries...',
      );
    }

    this.logger.log('Seeding default tag categories and tags...');

    for (const entry of TAG_SEED) {
      const existingCategory = await this.tagCategoriesService
        .findAll()
        .then((cats) => cats.find((c) => c.name === entry.category));

      let category;
      if (existingCategory) {
        this.logger.log(
          `[Category] "${entry.category}" already exists, skipping.`,
        );
        category = existingCategory;
      } else {
        this.logger.log(`[Category] Creating "${entry.category}"...`);
        category = await this.tagCategoriesService.create({
          name: entry.category,
        });
      }

      for (const tagName of entry.tags) {
        const existingTag = await this.tagsService
          .findByNames([tagName])
          .then((tags) => tags[0]);

        if (existingTag) {
          this.logger.log(`  [Tag] "${tagName}" already exists, skipping.`);
        } else {
          this.logger.log(
            `  [Tag] Creating "${tagName}" in "${entry.category}"...`,
          );
          await this.tagsService.create({
            name: tagName,
            categoryName: category.name,
          });
        }
      }
    }

    this.logger.log('Tags seeding complete.');
  }
}

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
    const categories = new Map(
      (await this.tagCategoriesService.findAll()).map((c) => [c.name, c]),
    );
    const tagNames = new Set(
      (await this.tagsService.findAll()).map((t) => t.name.toLowerCase()),
    );

    let createdCategories = 0;
    let createdTags = 0;

    for (const entry of TAG_SEED) {
      if (!categories.has(entry.category)) {
        const category = await this.tagCategoriesService.create({
          name: entry.category,
        });
        categories.set(category.name, category);
        createdCategories++;
      }

      for (const tagName of entry.tags) {
        if (tagNames.has(tagName.toLowerCase())) continue;
        await this.tagsService.create({
          name: tagName,
          categoryName: entry.category,
        });
        tagNames.add(tagName.toLowerCase());
        createdTags++;
      }
    }

    this.logger.log(
      `Tags seeding complete: ${createdCategories} categorie(s) and ${createdTags} tag(s) created.`,
    );
  }
}

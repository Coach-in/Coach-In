import { Logger } from '@nestjs/common';
import { TagsSeedService } from './tags-seed.service';
import { TagCategoriesService } from './tag-categories.service';
import { TagsService } from './tags.service';
import { TagCategory } from './entities/tag-category.entity';
import { Tag } from './entities/tag.entity';
import { TAG_SEED } from '../config/tags.config';

describe('TagsSeedService', () => {
  const categoriesService = { findAll: jest.fn(), create: jest.fn() };
  const tagsService = { findAll: jest.fn(), create: jest.fn() };
  const totalTags = TAG_SEED.reduce((sum, entry) => sum + entry.tags.length, 0);

  let service: TagsSeedService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    categoriesService.create.mockImplementation(({ name }: { name: string }) =>
      Promise.resolve({ id: name, name } as TagCategory),
    );
    service = new TagsSeedService(
      categoriesService as unknown as TagCategoriesService,
      tagsService as unknown as TagsService,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates everything on an empty database with one read per table', async () => {
    categoriesService.findAll.mockResolvedValue([]);
    tagsService.findAll.mockResolvedValue([]);

    await service.onApplicationBootstrap();

    expect(categoriesService.findAll).toHaveBeenCalledTimes(1);
    expect(tagsService.findAll).toHaveBeenCalledTimes(1);
    expect(categoriesService.create).toHaveBeenCalledTimes(TAG_SEED.length);
    expect(tagsService.create).toHaveBeenCalledTimes(totalTags);
  });

  it('creates nothing when the database is already seeded', async () => {
    categoriesService.findAll.mockResolvedValue(
      TAG_SEED.map(
        (e) => ({ id: e.category, name: e.category }) as TagCategory,
      ),
    );
    tagsService.findAll.mockResolvedValue(
      TAG_SEED.flatMap((e) => e.tags).map((name) => ({ name }) as Tag),
    );

    await service.onApplicationBootstrap();

    expect(categoriesService.create).not.toHaveBeenCalled();
    expect(tagsService.create).not.toHaveBeenCalled();
  });

  it('only creates the missing tags, ignoring case differences', async () => {
    categoriesService.findAll.mockResolvedValue(
      TAG_SEED.map(
        (e) => ({ id: e.category, name: e.category }) as TagCategory,
      ),
    );
    const [first, ...rest] = TAG_SEED.flatMap((e) => e.tags);
    tagsService.findAll.mockResolvedValue(
      rest.map((name) => ({ name: name.toUpperCase() }) as Tag),
    );

    await service.onApplicationBootstrap();

    expect(tagsService.create).toHaveBeenCalledTimes(1);
    expect(tagsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: first }),
    );
  });
});

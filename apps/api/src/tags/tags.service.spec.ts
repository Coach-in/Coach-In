import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { TagsService } from './tags.service';
import { TagCategoriesService } from './tag-categories.service';
import { Tag } from './entities/tag.entity';

describe('TagsService', () => {
  let service: TagsService;

  const queryBuilderMock = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const tagRepositoryMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
  };

  const tagCategoriesServiceMock = { findByName: jest.fn() };

  const football = { id: 'tag-1', name: 'Football' } as Tag;
  const tennis = { id: 'tag-2', name: 'Tennis' } as Tag;

  beforeEach(async () => {
    jest.clearAllMocks();

    tagRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilderMock);
    queryBuilderMock.getMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: tagRepositoryMock as unknown as Repository<Tag>,
        },
        { provide: TagCategoriesService, useValue: tagCategoriesServiceMock },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  describe('findByNames', () => {
    it('lowercases the requested names before querying', async () => {
      queryBuilderMock.getMany.mockResolvedValue([football]);

      await service.findByNames(['Football', 'TENNIS']);

      expect(queryBuilderMock.where).toHaveBeenCalledWith(
        'LOWER(tag.name) IN (:...names)',
        { names: ['football', 'tennis'] },
      );
    });
  });

  describe('findOrCreateByNames', () => {
    it('creates only the names that are missing', async () => {
      queryBuilderMock.getMany.mockResolvedValue([football]);
      tagRepositoryMock.save.mockImplementation(
        (tag: Partial<Tag>) => ({ id: 'tag-new', ...tag }) as Tag,
      );

      const result = await service.findOrCreateByNames(['Football', 'Boxing']);

      expect(tagRepositoryMock.save).toHaveBeenCalledTimes(1);
      expect(tagRepositoryMock.save).toHaveBeenCalledWith({ name: 'Boxing' });
      expect(result).toEqual([football, { id: 'tag-new', name: 'Boxing' }]);
    });

    it('creates nothing when every name already exists', async () => {
      queryBuilderMock.getMany.mockResolvedValue([football, tennis]);

      const result = await service.findOrCreateByNames(['Football', 'Tennis']);

      expect(tagRepositoryMock.save).not.toHaveBeenCalled();
      expect(result).toEqual([football, tennis]);
    });

    it('matches existing tags case-insensitively', async () => {
      queryBuilderMock.getMany.mockResolvedValue([football]);

      await service.findOrCreateByNames(['FOOTBALL']);

      expect(tagRepositoryMock.save).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the tag when it exists', async () => {
      tagRepositoryMock.findOne.mockResolvedValue(football);

      await expect(service.findOne(football.id)).resolves.toEqual(football);
    });

    it('raises NotFound when the tag does not exist', async () => {
      tagRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

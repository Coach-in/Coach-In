import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { CoachsService } from './coachs.service';
import { Coach } from './entities/coach.entity';
import { Tag } from '../tags/entities/tag.entity';
import { TagsService } from '../tags/tags.service';
import { User } from '../users/entities/user.entity';

describe('CoachsService', () => {
  let service: CoachsService;

  const coachRepositoryMock = {
    create: jest.fn((input: Partial<Coach>) => input as Coach),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const tagsServiceMock = { findByNames: jest.fn() };

  const football = { id: 'tag-1', name: 'Football' } as Tag;
  const tennis = { id: 'tag-2', name: 'Tennis' } as Tag;

  const owner = { id: 'user-1', username: 'jane_coach' } as User;
  const coach = {
    id: 'coach-1',
    bio: 'Ten years of experience',
    isApproved: true,
    tags: [football],
    user: owner,
  } as Coach;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoachsService,
        {
          provide: getRepositoryToken(Coach),
          useValue: coachRepositoryMock as unknown as Repository<Coach>,
        },
        { provide: TagsService, useValue: tagsServiceMock },
      ],
    }).compile();

    service = module.get<CoachsService>(CoachsService);
  });

  describe('create', () => {
    it('resolves tag names and attaches the owner', async () => {
      tagsServiceMock.findByNames.mockResolvedValue([football, tennis]);
      coachRepositoryMock.save.mockImplementation((input: Coach) =>
        Promise.resolve(input),
      );

      const result = await service.create(
        { specialty: 'Football', bio: 'Bio', tagNames: ['Football', 'Tennis'] },
        owner,
      );

      expect(tagsServiceMock.findByNames).toHaveBeenCalledWith([
        'Football',
        'Tennis',
      ]);
      expect(result.tags).toEqual([football, tennis]);
      expect(result.user).toBe(owner);
    });

    it('starts with no tags when tagNames is omitted', async () => {
      coachRepositoryMock.save.mockImplementation((input: Coach) =>
        Promise.resolve(input),
      );

      const result = await service.create({ specialty: 'Football' }, owner);

      expect(tagsServiceMock.findByNames).not.toHaveBeenCalled();
      expect(result.tags).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('only returns approved coaches', async () => {
      coachRepositoryMock.find.mockResolvedValue([coach]);

      const result = await service.findAll();

      expect(coachRepositoryMock.find).toHaveBeenCalledWith({
        where: { isApproved: true },
      });
      expect(result).toEqual([coach]);
    });
  });

  describe('findOne', () => {
    it('returns the coach when it exists', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(coach);

      await expect(service.findOne(coach.id)).resolves.toEqual(coach);
    });

    it('raises NotFound when the coach does not exist', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMe', () => {
    it('looks the coach up through the owning user', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(coach);

      const result = await service.findMe(owner.id);

      expect(coachRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { user: { id: owner.id } },
      });
      expect(result).toEqual(coach);
    });

    it('raises NotFound when the user has no coach profile', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.findMe('user-without-profile')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the coach', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(coach);
      coachRepositoryMock.remove.mockResolvedValue(coach);

      await service.remove(coach.id);

      expect(coachRepositoryMock.remove).toHaveBeenCalledWith(coach);
    });

    it('raises NotFound and removes nothing when the coach does not exist', async () => {
      coachRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(coachRepositoryMock.remove).not.toHaveBeenCalled();
    });
  });
});

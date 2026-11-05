import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AthletesService } from './athletes.service';
import { Athlete } from './entities/athlete.entity';
import { TagsService } from '../tags/tags.service';
import { Tag } from '../tags/entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { AuthUser } from '../auth/auth.types';
import { UserRole } from '../utils/types/jwt.types';

describe('AthletesService', () => {
  const football = { id: 'tag-1', name: 'Football' } as Tag;

  const ownerAuth: AuthUser = {
    id: 'user-1',
    email: 'john@example.com',
    role: UserRole.ATHLETE,
  };
  const strangerAuth: AuthUser = { ...ownerAuth, id: 'user-2' };
  const adminAuth: AuthUser = {
    ...ownerAuth,
    id: 'user-3',
    role: UserRole.ADMIN,
  };

  let athlete: Athlete;
  let athleteRepository: {
    findOneBy: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let tagsService: { findByNames: jest.Mock };
  let service: AthletesService;

  beforeEach(() => {
    athlete = Object.assign(new Athlete(), {
      id: 'ath-1',
      age: 22,
      goals: 'Old goal',
      tags: [football],
      user: Object.assign(new User(), { id: ownerAuth.id }),
    });
    athleteRepository = {
      findOneBy: jest.fn().mockResolvedValue(athlete),
      save: jest.fn((a: Athlete) => Promise.resolve(a)),
      delete: jest.fn(),
    };
    tagsService = { findByNames: jest.fn().mockResolvedValue([]) };
    service = new AthletesService(
      athleteRepository as unknown as Repository<Athlete>,
      tagsService as unknown as TagsService,
    );
  });

  it('keeps the existing tags when tagNames is not sent', async () => {
    const result = await service.update('ath-1', { goals: 'New' }, ownerAuth);

    expect(result.tags).toEqual([football]);
    expect(result.goals).toBe('New');
    expect(tagsService.findByNames).not.toHaveBeenCalled();
  });

  it('replaces the tags when tagNames is sent', async () => {
    const result = await service.update('ath-1', { tagNames: [] }, ownerAuth);

    expect(result.tags).toEqual([]);
  });

  it('forbids updating another athlete', async () => {
    await expect(
      service.update('ath-1', { goals: 'Hijacked' }, strangerAuth),
    ).rejects.toThrow(ForbiddenException);
  });

  it('forbids reading another athlete profile', async () => {
    await expect(service.findOneAs('ath-1', strangerAuth)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.findOneAs('ath-1', adminAuth)).resolves.toBe(athlete);
  });

  it('forbids deleting another athlete', async () => {
    await expect(service.remove('ath-1', strangerAuth)).rejects.toThrow(
      ForbiddenException,
    );
    expect(athleteRepository.delete).not.toHaveBeenCalled();
  });
});

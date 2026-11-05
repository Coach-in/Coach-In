import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CoachsService } from './coachs.service';
import { Coach } from './entities/coach.entity';
import { TagsService } from '../tags/tags.service';
import { Tag } from '../tags/entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { UpdateCoachDto } from './dto/update-coach.dto';
import { AuthUser } from '../auth/auth.types';
import { UserRole } from '../utils/types/jwt.types';

describe('CoachsService.update', () => {
  const football = { id: 'tag-1', name: 'Football' } as Tag;
  const tennis = { id: 'tag-2', name: 'Tennis' } as Tag;

  const ownerAuth: AuthUser = {
    id: 'user-1',
    email: 'jane@example.com',
    role: UserRole.COACH,
  };
  const strangerAuth: AuthUser = { ...ownerAuth, id: 'user-2' };
  const adminAuth: AuthUser = {
    id: 'user-3',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  let coach: Coach;
  let tagsService: { findByNames: jest.Mock };
  let service: CoachsService;

  beforeEach(() => {
    coach = Object.assign(new Coach(), {
      id: 'coach-1',
      specialty: 'Running',
      bio: 'Old bio',
      isApproved: false,
      tags: [football],
      user: Object.assign(new User(), { id: ownerAuth.id }),
    });
    const coachRepository = {
      findOne: jest.fn().mockResolvedValue(coach),
      save: jest.fn((c: Coach) => Promise.resolve(c)),
    };
    tagsService = { findByNames: jest.fn().mockResolvedValue([tennis]) };
    service = new CoachsService(
      coachRepository as unknown as Repository<Coach>,
      tagsService as unknown as TagsService,
    );
  });

  it('never lets the caller set isApproved', async () => {
    const result = await service.update(
      'coach-1',
      { bio: 'New bio', isApproved: true } as UpdateCoachDto,
      ownerAuth,
    );

    expect(result.isApproved).toBe(false);
    expect(result.bio).toBe('New bio');
    expect(result.specialty).toBe('Running');
  });

  it('keeps the existing tags when tagNames is not sent', async () => {
    const result = await service.update(
      'coach-1',
      { bio: 'New bio' },
      ownerAuth,
    );

    expect(result.tags).toEqual([football]);
    expect(tagsService.findByNames).not.toHaveBeenCalled();
  });

  it('replaces the tags when tagNames is sent', async () => {
    const result = await service.update(
      'coach-1',
      { tagNames: ['Tennis'] },
      ownerAuth,
    );

    expect(result.tags).toEqual([tennis]);
  });

  it('clears the tags when tagNames is an empty list', async () => {
    tagsService.findByNames.mockResolvedValue([]);

    const result = await service.update('coach-1', { tagNames: [] }, ownerAuth);

    expect(result.tags).toEqual([]);
  });

  it('forbids updating the profile of another coach', async () => {
    await expect(
      service.update('coach-1', { bio: 'Hijacked' }, strangerAuth),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets an administrator update any coach', async () => {
    const result = await service.update(
      'coach-1',
      { bio: 'Edited by admin' },
      adminAuth,
    );

    expect(result.bio).toBe('Edited by admin');
  });
});

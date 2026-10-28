import { CoachsService } from './coachs.service';
import { Coach } from './entities/coach.entity';
import { Repository } from 'typeorm';
import { TagsService } from '../tags/tags.service';
import { UpdateCoachDto } from './dto/update-coach.dto';

describe('CoachsService.update (security)', () => {
  it('never lets the caller set isApproved', async () => {
    const coach = Object.assign(new Coach(), {
      id: 'coach-1',
      specialty: 'Running',
      bio: 'Old bio',
      isApproved: false,
      tags: [],
    });
    const coachRepository = {
      findOne: jest.fn().mockResolvedValue(coach),
      save: jest.fn((c: Coach) => Promise.resolve(c)),
    };
    const tagsService = { findByNames: jest.fn().mockResolvedValue([]) };
    const service = new CoachsService(
      coachRepository as unknown as Repository<Coach>,
      tagsService as unknown as TagsService,
    );

    const result = await service.update('coach-1', {
      bio: 'New bio',
      tagNames: [],
      isApproved: true,
    } as UpdateCoachDto);

    expect(result.isApproved).toBe(false);
    expect(result.bio).toBe('New bio');
    expect(result.specialty).toBe('Running');
  });
});

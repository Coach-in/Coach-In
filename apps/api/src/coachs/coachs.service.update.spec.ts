import { CoachsService } from './coachs.service';
import { Coach } from './entities/coach.entity';

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
      coachRepository as any,
      tagsService as any,
    );

    const result = await service.update('coach-1', {
      bio: 'New bio',
      tagNames: [],
      isApproved: true,
    } as any);

    expect(result.isApproved).toBe(false);
    expect(result.bio).toBe('New bio');
    expect(result.specialty).toBe('Running');
  });
});

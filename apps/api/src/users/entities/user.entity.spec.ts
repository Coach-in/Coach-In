import { instanceToPlain } from 'class-transformer';
import { User } from './user.entity';
import { Coach } from '../../coachs/entities/coach.entity';

// ClassSerializerInterceptor serializes responses with instanceToPlain, so
// these tests cover what clients actually receive.
describe('User serialization', () => {
  const makeUser = () =>
    Object.assign(new User(), {
      id: 'user-1',
      email: 'jane@example.com',
      username: 'jane',
      role: 'coach',
      password: '$2b$10$hash',
      refresh_token: 'refresh',
    });

  it('drops password and refresh_token from a User', () => {
    expect(instanceToPlain(makeUser())).toEqual({
      id: 'user-1',
      email: 'jane@example.com',
      username: 'jane',
      role: 'coach',
    });
  });

  it('drops them from a user nested in a plain wrapper (signup/login shape)', () => {
    const plain = instanceToPlain({ user: makeUser(), token: 'jwt' });
    expect(plain.user).not.toHaveProperty('password');
    expect(plain.user).not.toHaveProperty('refresh_token');
    expect(plain.token).toBe('jwt');
  });

  it('drops them from an eager-loaded user inside a spread entity (coach-documents shape)', () => {
    const coach = Object.assign(new Coach(), {
      id: 'coach-1',
      specialty: 'Running',
      isApproved: false,
      tags: [],
      user: makeUser(),
    });
    const [doc] = instanceToPlain([
      { id: 'doc-1', coach, url: 'https://x' },
    ]) as Array<{ coach: { user: object; isApproved: boolean } }>;
    expect(doc.coach.user).not.toHaveProperty('password');
    expect(doc.coach.user).not.toHaveProperty('refresh_token');
    expect(doc.coach.isApproved).toBe(false);
  });
});

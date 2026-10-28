import bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from '../utils/types/jwt.types';

describe('UsersService (security)', () => {
  let service: UsersService;
  let userRepository: {
    update: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let athletesService: { create: jest.Mock };

  beforeEach(() => {
    userRepository = {
      update: jest.fn(),
      save: jest.fn((user: User) =>
        Promise.resolve(Object.assign(user, { id: 'user-1' })),
      ),
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    athletesService = { create: jest.fn().mockResolvedValue({ id: 'ath-1' }) };
    service = new UsersService(
      userRepository as any,
      { get: () => 'test-secret' } as any,
      {} as any,
      athletesService as any,
      {} as any,
    );
  });

  describe('update', () => {
    it('never writes role or refresh_token', async () => {
      await service.update('user-1', {
        username: 'new_name',
        role: 'admin',
        refresh_token: 'x',
      } as any);

      expect(userRepository.update).toHaveBeenCalledWith('user-1', {
        username: 'new_name',
      });
    });

    it('stores a bcrypt hash, not the plain password', async () => {
      await service.update('user-1', { password: 'NewPassw0rd' });

      const [, changes] = userRepository.update.mock.calls[0] as [
        string,
        Partial<User>,
      ];
      expect(changes.password).not.toBe('NewPassw0rd');
      await expect(
        bcrypt.compare('NewPassw0rd', changes.password as string),
      ).resolves.toBe(true);
    });

    it('does not hit the database when there is nothing to update', async () => {
      await expect(service.update('user-1', {})).resolves.toEqual({
        message: 'User user-1 updated successfully',
      });
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('returns a User instance so the password hash is excluded from the response', async () => {
      const result = await service.create({
        email: 'athlete@example.com',
        username: 'john',
        password: 'password123',
        role: UserRole.ATHLETE,
        athleteProfile: { age: 22 },
      });

      expect(result.user).toBeInstanceOf(User);
    });
  });
});

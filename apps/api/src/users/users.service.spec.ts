import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CoachsService } from '../coachs/coachs.service';
import { AthletesService } from '../athletes/athletes.service';
import { AdminsService } from '../admins/admins.service';
import { UserRole } from '../utils/types/jwt.types';
import { AuthUser } from '../auth/auth.types';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;

  const userRepositoryMock = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const transactionalSave = jest.fn();
  const managerMock = {
    getRepository: jest.fn(() => ({ save: transactionalSave })),
  };
  const dataSourceMock = {
    transaction: jest.fn((work: (manager: unknown) => Promise<unknown>) =>
      work(managerMock),
    ),
  };

  const coachProfile = { id: 'coach-profile-id', specialty: 'Tennis' };
  const athleteProfile = { id: 'athlete-profile-id', age: 22 };
  const adminProfile = { id: 'admin-profile-id' };

  const coachsServiceMock = {
    create: jest.fn().mockResolvedValue(coachProfile),
  };
  const athletesServiceMock = {
    create: jest.fn().mockResolvedValue(athleteProfile),
  };
  const adminsServiceMock = {
    create: jest.fn().mockResolvedValue(adminProfile),
    count: jest.fn(),
  };

  const jwtSecret = 'unit-test-secret';

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return jwtSecret;
      throw new Error(`missing ${key}`);
    }),
  };

  const athleteDto = { age: 22, goals: 'Improve endurance' };
  const coachDto = { specialty: 'Tennis', bio: 'Former pro player' };

  const storedUser: User = {
    id: '3f0c2a1e-0000-4000-8000-000000000001',
    username: 'john_athlete',
    email: 'john@example.com',
    role: UserRole.ATHLETE,
    password: '$2b$10$hashedvalue',
  };

  const self: AuthUser = {
    id: storedUser.id,
    email: storedUser.email,
    role: UserRole.ATHLETE,
  };
  const stranger: AuthUser = {
    id: '3f0c2a1e-0000-4000-8000-000000000999',
    email: 'other@example.com',
    role: UserRole.COACH,
  };
  const admin: AuthUser = {
    id: '3f0c2a1e-0000-4000-8000-000000000777',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    transactionalSave.mockImplementation((user: User) =>
      Promise.resolve(Object.assign(user, { id: storedUser.id })),
    );
    userRepositoryMock.findOne.mockResolvedValue(null);
    userRepositoryMock.findOneBy.mockResolvedValue(storedUser);
    adminsServiceMock.count.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: CoachsService, useValue: coachsServiceMock },
        { provide: AthletesService, useValue: athletesServiceMock },
        { provide: AdminsService, useValue: adminsServiceMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    const athleteSignup = {
      email: 'john@example.com',
      username: 'john_athlete',
      password: 'password123',
      role: UserRole.ATHLETE,
      athleteProfile: athleteDto,
    };
    const adminSignup = {
      email: 'admin@example.com',
      username: 'admin_user',
      password: 'password123',
      role: UserRole.ADMIN,
    };

    it('rejects an email that is already registered with a conflict', async () => {
      userRepositoryMock.findOne.mockResolvedValue(storedUser);

      await expect(service.create(athleteSignup)).rejects.toThrow(
        ConflictException,
      );
      expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it('stores a bcrypt hash instead of the plain-text password', async () => {
      const { user } = await service.create(athleteSignup);

      const [savedUser] = transactionalSave.mock.calls[0] as [Partial<User>];
      expect(savedUser.password).not.toBe(athleteSignup.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$/);
      await expect(
        bcrypt.compare(athleteSignup.password, user.password),
      ).resolves.toBe(true);
    });

    it('returns a User instance so the hash is stripped from responses', async () => {
      const { user } = await service.create(athleteSignup);

      expect(user).toBeInstanceOf(User);
    });

    it('returns a token that verifies against the configured secret', async () => {
      const { token } = await service.create(athleteSignup);

      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      expect(payload.userId).toBe(storedUser.id);
      expect(payload.email).toBe(storedUser.email);
    });

    it('creates the user and its profile inside one transaction', async () => {
      await service.create(athleteSignup);

      expect(dataSourceMock.transaction).toHaveBeenCalledTimes(1);
      expect(athletesServiceMock.create).toHaveBeenCalledWith(
        athleteDto,
        expect.objectContaining({ email: athleteSignup.email }),
        managerMock,
      );
    });

    it('creates an athlete profile by default', async () => {
      const { athlete, coach, admin } = await service.create(athleteSignup);

      expect(athlete).toBeDefined();
      expect(coach).toBeUndefined();
      expect(admin).toBeUndefined();
    });

    it('creates a coach profile when the role is coach', async () => {
      const { coach, athlete } = await service.create({
        email: 'jane@example.com',
        username: 'jane_coach',
        password: 'password123',
        role: UserRole.COACH,
        coachProfile: coachDto,
      });

      expect(coachsServiceMock.create).toHaveBeenCalledWith(
        coachDto,
        expect.objectContaining({ email: 'jane@example.com' }),
        managerMock,
      );
      expect(coach).toBeDefined();
      expect(athlete).toBeUndefined();
    });

    it('lets an administrator create another admin account', async () => {
      const { admin: created } = await service.create(adminSignup, admin);

      expect(adminsServiceMock.create).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ email: 'admin@example.com' }),
        managerMock,
      );
      expect(created).toBeDefined();
    });

    it('lets the very first admin be created when none exists yet', async () => {
      adminsServiceMock.count.mockResolvedValue(0);

      await expect(service.create(adminSignup)).resolves.toMatchObject({
        admin: adminProfile,
      });
    });

    it('refuses an anonymous admin signup once an admin exists', async () => {
      await expect(service.create(adminSignup)).rejects.toThrow(
        ForbiddenException,
      );
      expect(dataSourceMock.transaction).not.toHaveBeenCalled();
    });

    it('refuses an admin signup requested by a non-admin', async () => {
      await expect(service.create(adminSignup, stranger)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('login', () => {
    const credentials = { email: 'john@example.com', password: 'password123' };

    it('answers unknown emails and wrong passwords with the same error', async () => {
      userRepositoryMock.findOne.mockResolvedValue(null);
      const unknown = await service.login(credentials).catch((e: Error) => e);

      userRepositoryMock.findOne.mockResolvedValue({
        ...storedUser,
        password: await bcrypt.hash('some-other-password', 10),
      });
      const wrong = await service.login(credentials).catch((e: Error) => e);

      expect(unknown).toBeInstanceOf(UnauthorizedException);
      expect(wrong).toBeInstanceOf(UnauthorizedException);
      expect((unknown as Error).message).toBe((wrong as Error).message);
    });

    it('returns the user and a verifiable token on valid credentials', async () => {
      userRepositoryMock.findOne.mockResolvedValue({
        ...storedUser,
        password: await bcrypt.hash(credentials.password, 10),
      });

      const { user, token } = await service.login(credentials);

      expect(user.email).toBe(credentials.email);
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      expect(payload.userId).toBe(storedUser.id);
    });
  });

  describe('findOneId', () => {
    it('raises NotFound for an unknown id', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(null);

      await expect(service.findOneId(storedUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneAs', () => {
    it('returns the profile of the requester', async () => {
      await expect(service.findOneAs(storedUser.id, self)).resolves.toBe(
        storedUser,
      );
    });

    it('forbids reading another user', async () => {
      await expect(service.findOneAs(storedUser.id, stranger)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets an administrator read any user', async () => {
      await expect(service.findOneAs(storedUser.id, admin)).resolves.toBe(
        storedUser,
      );
    });
  });

  describe('update', () => {
    it('forbids updating another user', async () => {
      await expect(
        service.update(storedUser.id, { username: 'x' }, stranger),
      ).rejects.toThrow(ForbiddenException);
      expect(userRepositoryMock.update).not.toHaveBeenCalled();
    });

    it('raises NotFound for an unknown user', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(storedUser.id, { username: 'x' }, admin),
      ).rejects.toThrow(NotFoundException);
    });

    it('never writes role or refresh_token', async () => {
      await service.update(
        storedUser.id,
        {
          username: 'john_renamed',
          role: 'admin',
          refresh_token: 'x',
        } as UpdateUserDto,
        self,
      );

      expect(userRepositoryMock.update).toHaveBeenCalledWith(storedUser.id, {
        username: 'john_renamed',
      });
    });

    it('stores a bcrypt hash, not the plain password', async () => {
      await service.update(storedUser.id, { password: 'NewPassw0rd' }, self);

      const [, changes] = userRepositoryMock.update.mock.calls[0] as [
        string,
        Partial<User>,
      ];
      expect(changes.password).not.toBe('NewPassw0rd');
      await expect(
        bcrypt.compare('NewPassw0rd', changes.password as string),
      ).resolves.toBe(true);
    });

    it('rejects an email already used by another account', async () => {
      userRepositoryMock.findOne.mockResolvedValue({
        ...storedUser,
        id: stranger.id,
      });

      await expect(
        service.update(storedUser.id, { email: 'taken@example.com' }, self),
      ).rejects.toThrow(ConflictException);
    });

    it('does not hit the database when there is nothing to update', async () => {
      await expect(service.update(storedUser.id, {}, self)).resolves.toEqual({
        message: `User ${storedUser.id} updated successfully`,
      });
      expect(userRepositoryMock.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('forbids deleting another user', async () => {
      await expect(service.remove(storedUser.id, stranger)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepositoryMock.delete).not.toHaveBeenCalled();
    });

    it('lets users delete their own account', async () => {
      await expect(service.remove(storedUser.id, self)).resolves.toEqual({
        message: `User ${storedUser.id} deleted successfully`,
      });
      expect(userRepositoryMock.delete).toHaveBeenCalledWith(storedUser.id);
    });
  });
});

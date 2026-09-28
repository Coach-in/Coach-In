import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CoachsService } from '../coachs/coachs.service';
import { AthletesService } from '../athletes/athletes.service';
import { AdminsService } from '../admins/admins.service';
import { UserRole } from '../utils/types/jwt.types';

describe('UsersService', () => {
  let service: UsersService;

  const userRepositoryMock = {
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
  };

  const jwtSecret = 'unit-test-secret';

  const configServiceMock = {
    get: jest.fn((key: string) =>
      key === 'JWT_SECRET' ? jwtSecret : undefined,
    ),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    userRepositoryMock.save.mockImplementation(
      (user: Partial<User>) => ({ id: storedUser.id, ...user }) as User,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepositoryMock },
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

    it('rejects an email that is already registered', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(storedUser);

      await expect(service.create(athleteSignup)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('stores a bcrypt hash instead of the plain-text password', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(null);

      const { user } = await service.create(athleteSignup);

      const [savedUser] = userRepositoryMock.save.mock.calls[0] as [
        Partial<User>,
      ];
      expect(savedUser.password).not.toBe(athleteSignup.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$/);
      await expect(
        bcrypt.compare(athleteSignup.password, user.password),
      ).resolves.toBe(true);
    });

    it('returns a token that verifies against the configured secret', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(null);

      const { token } = await service.create(athleteSignup);

      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      expect(payload.userId).toBe(storedUser.id);
      expect(payload.email).toBe(storedUser.email);
    });

    it('creates an athlete profile by default', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(null);

      const { athlete, coach, admin } = await service.create(athleteSignup);

      expect(athletesServiceMock.create).toHaveBeenCalledWith(
        athleteDto,
        expect.objectContaining({ email: athleteSignup.email }),
      );
      expect(athlete).toBeDefined();
      expect(coach).toBeUndefined();
      expect(admin).toBeUndefined();
    });

    it('creates a coach profile when the role is coach', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(null);

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
      );
      expect(coach).toBeDefined();
      expect(athlete).toBeUndefined();
    });

    it('creates an admin profile when the role is admin', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(null);

      const { admin, athlete } = await service.create({
        email: 'admin@example.com',
        username: 'admin_user',
        password: 'password123',
        role: UserRole.ADMIN,
      });

      expect(adminsServiceMock.create).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ email: 'admin@example.com' }),
      );
      expect(admin).toBeDefined();
      expect(athlete).toBeUndefined();
    });
  });

  describe('login', () => {
    const credentials = { email: 'john@example.com', password: 'password123' };

    it('raises NotFound when no user matches the email', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue(null);

      await expect(service.login(credentials)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('raises Unauthorized when the password does not match', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue({
        ...storedUser,
        password: await bcrypt.hash('some-other-password', 10),
      });

      await expect(service.login(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns the user and a verifiable token on valid credentials', async () => {
      userRepositoryMock.findOneBy.mockResolvedValue({
        ...storedUser,
        password: await bcrypt.hash(credentials.password, 10),
      });

      const { user, token } = await service.login(credentials);

      expect(user.email).toBe(credentials.email);
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      expect(payload.userId).toBe(storedUser.id);
    });
  });

  describe('update', () => {
    it('delegates the change to the repository and reports success', async () => {
      userRepositoryMock.update.mockResolvedValue({ affected: 1 });

      await expect(
        service.update(storedUser.id, { username: 'john_renamed' }),
      ).resolves.toEqual({
        message: `User ${storedUser.id} updated successfully`,
      });
      expect(userRepositoryMock.update).toHaveBeenCalledWith(storedUser.id, {
        username: 'john_renamed',
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    create: jest.fn(),
    login: jest.fn(),
    findAll: jest.fn(),
    findOneId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const jwtSecret = 'unit-test-secret';
  const configServiceMock = {
    get: jest.fn((key: string) =>
      key === 'JWT_SECRET' ? jwtSecret : undefined,
    ),
  };

  const userId = '3f0c2a1e-0000-4000-8000-000000000001';
  const currentUser = {
    id: userId,
    email: 'john@example.com',
  } as User;

  beforeEach(async () => {
    jest.clearAllMocks();
    usersServiceMock.findOneId.mockResolvedValue(currentUser);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('findMe', () => {
    it('returns the user matching a valid bearer token', async () => {
      const token = jwt.sign({ userId, email: currentUser.email }, jwtSecret);

      await expect(controller.findMe(`Bearer ${token}`)).resolves.toEqual(
        currentUser,
      );
      expect(usersServiceMock.findOneId).toHaveBeenCalledWith(userId);
    });

    it('rejects a missing authorization header', async () => {
      await expect(
        controller.findMe(undefined as unknown as string),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a header that is not a bearer scheme', async () => {
      const token = jwt.sign({ userId, email: currentUser.email }, jwtSecret);

      await expect(controller.findMe(`Basic ${token}`)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token signed with the wrong secret', async () => {
      const token = jwt.sign(
        { userId, email: currentUser.email },
        'not-the-right-secret',
      );

      await expect(controller.findMe(`Bearer ${token}`)).rejects.toBeInstanceOf(
        Error,
      );
    });
  });
});

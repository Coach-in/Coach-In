import { Test, TestingModule } from '@nestjs/testing';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { AuthUser } from '../auth/auth.types';
import { UserRole } from '../utils/types/jwt.types';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    create: jest.fn(),
    login: jest.fn(),
    findAll: jest.fn(),
    findOneId: jest.fn(),
    findOneAs: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const requester: AuthUser = {
    id: '3f0c2a1e-0000-4000-8000-000000000001',
    email: 'john@example.com',
    role: UserRole.ATHLETE,
  };
  const currentUser = { id: requester.id, email: requester.email } as User;

  beforeEach(async () => {
    jest.clearAllMocks();
    usersServiceMock.findOneId.mockResolvedValue(currentUser);
    usersServiceMock.findOneAs.mockResolvedValue(currentUser);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('returns the authenticated user for /me', async () => {
    await expect(controller.findMe(requester)).resolves.toBe(currentUser);
    expect(usersServiceMock.findOneId).toHaveBeenCalledWith(requester.id);
  });

  it('passes the requester to the service when reading a user', async () => {
    await controller.findOne(requester.id, requester);

    expect(usersServiceMock.findOneAs).toHaveBeenCalledWith(
      requester.id,
      requester,
    );
  });

  it('passes the requester to the service when updating a user', async () => {
    await controller.update(requester.id, { username: 'new' }, requester);

    expect(usersServiceMock.update).toHaveBeenCalledWith(
      requester.id,
      { username: 'new' },
      requester,
    );
  });

  it('passes the requester to the service when deleting a user', async () => {
    await controller.remove(requester.id, requester);

    expect(usersServiceMock.remove).toHaveBeenCalledWith(
      requester.id,
      requester,
    );
  });

  it('passes the optional requester to signup', async () => {
    const dto = {
      email: 'admin@example.com',
      username: 'admin',
      password: 'password123',
      role: UserRole.ADMIN,
    };

    await controller.create(dto, undefined);

    expect(usersServiceMock.create).toHaveBeenCalledWith(dto, undefined);
  });
});

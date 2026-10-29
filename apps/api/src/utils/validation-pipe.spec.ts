import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { createValidationPipe } from './validation-pipe';
import { UpdateCoachDto } from '../coachs/dto/update-coach.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UpdateAdminDto } from '../admins/dto/update-admin.dto';
import { CreateUserWithProfileDto } from '../users/dto/create-user-with-profile.dto';
import { LoginUserDto } from '../users/dto/login-user.dto';

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const body = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
    type: 'body',
    metatype,
  });

  it('strips isApproved from a coach update (no self-certification)', async () => {
    const result = (await pipe.transform(
      { bio: 'New bio', isApproved: true },
      body(UpdateCoachDto),
    )) as UpdateCoachDto;
    expect(result).toEqual({ bio: 'New bio' });
    expect(result).not.toHaveProperty('isApproved');
  });

  it('strips role and refresh_token from a user update', async () => {
    const result = (await pipe.transform(
      { username: 'new_name', role: 'admin', refresh_token: 'x' },
      body(UpdateUserDto),
    )) as UpdateUserDto;
    expect(result).toEqual({ username: 'new_name' });
  });

  it('accepts an empty admin update (DTO without decorators)', async () => {
    await expect(pipe.transform({}, body(UpdateAdminDto))).resolves.toEqual({});
  });

  it('strips unknown nested profile fields instead of rejecting them', async () => {
    const result = (await pipe.transform(
      {
        email: 'coach@example.com',
        username: 'jane',
        password: 'password123',
        role: 'coach',
        coachProfile: { specialty: 'Running', diploma: 'BPJEPS' },
      },
      body(CreateUserWithProfileDto),
    )) as CreateUserWithProfileDto;
    expect(result.coachProfile).toEqual({ specialty: 'Running' });
  });

  it('coerces athlete age sent as a string (mobile payload)', async () => {
    const result = (await pipe.transform(
      {
        email: 'athlete@example.com',
        username: 'john',
        password: 'password123',
        role: 'athlete',
        athleteProfile: { age: '22', goal: 'ignored' },
      },
      body(CreateUserWithProfileDto),
    )) as CreateUserWithProfileDto;
    expect(result.athleteProfile).toEqual({ age: 22 });
  });

  it('rejects an athlete signup without athleteProfile', async () => {
    await expect(
      pipe.transform(
        {
          email: 'athlete@example.com',
          username: 'john',
          password: 'password123',
          role: 'athlete',
        },
        body(CreateUserWithProfileDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts an admin signup without adminProfile', async () => {
    await expect(
      pipe.transform(
        {
          email: 'admin@example.com',
          username: 'admin',
          password: 'password123',
          role: 'admin',
        },
        body(CreateUserWithProfileDto),
      ),
    ).resolves.toMatchObject({ role: 'admin' });
  });

  it('rejects an invalid email', async () => {
    await expect(
      pipe.transform(
        { email: 'not-an-email', password: 'x' },
        body(LoginUserDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('trims and lower-cases emails', async () => {
    const result = (await pipe.transform(
      { email: '  John@Example.COM ', password: 'x' },
      body(LoginUserDto),
    )) as LoginUserDto;
    expect(result.email).toBe('john@example.com');
  });

  it('accepts a short password on login (legacy accounts)', async () => {
    await expect(
      pipe.transform(
        { email: 'old@example.com', password: 'short' },
        body(LoginUserDto),
      ),
    ).resolves.toEqual({ email: 'old@example.com', password: 'short' });
  });
});

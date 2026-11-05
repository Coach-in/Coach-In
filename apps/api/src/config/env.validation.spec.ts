import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = {
    JWT_SECRET: 'secret',
    DB_HOST: 'localhost',
    DB_USER: 'postgres',
    DB_PASSWORD: 'postgres',
    DB_NAME: 'coachin',
  };

  it('accepts a complete development configuration', () => {
    expect(validateEnv(base)).toEqual(base);
  });

  it('names every missing variable', () => {
    expect(() =>
      validateEnv({ ...base, JWT_SECRET: '', DB_NAME: undefined }),
    ).toThrow('JWT_SECRET, DB_NAME');
  });

  it('does not require MinIO settings outside production', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'development' }),
    ).not.toThrow();
  });

  it('requires MinIO settings in production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      'MINIO_ENDPOINT',
    );
  });
});

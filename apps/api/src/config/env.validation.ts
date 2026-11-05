const REQUIRED = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

const REQUIRED_IN_PRODUCTION = [
  'MINIO_ENDPOINT',
  'MINIO_PUBLIC_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
];

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required =
    config.NODE_ENV === 'production'
      ? [...REQUIRED, ...REQUIRED_IN_PRODUCTION]
      : REQUIRED;
  const missing = required.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim() === '';
  });
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
  return config;
}

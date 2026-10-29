export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function errorStack(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined;
}

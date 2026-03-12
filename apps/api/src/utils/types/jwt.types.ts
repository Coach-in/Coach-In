export interface TokenContent {
  userId: string;
  email: string;
}

export enum UserRole {
  ATHLETE = 'athlete',
  COACH = 'coach',
  ADMIN = 'admin',
}

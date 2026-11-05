import { UserRole } from '../utils/types/jwt.types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

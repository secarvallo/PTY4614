import { User } from '../interfaces/auth.unified';

/**
 * Normaliza un objeto user que puede venir en formato snake_case + anidado profile
 * a la forma mixta usada internamente (con campos camelCase de compatibilidad).
 * No clona profundamente todo; muta el objeto de entrada de forma controlada para reducir GC.
 */
export function normalizeUser(user: any): User {
  if (!user) return user;
  const p = user.profile;
  user.firstName = user.firstName ?? p?.nombre ?? p?.firstName ?? '';
  user.lastName = user.lastName ?? p?.apellido ?? p?.lastName ?? '';
  user.phone = user.phone ?? p?.telefono ?? p?.phone;
  user.avatar = user.avatar ?? p?.avatar_url;
  user.birthDate = user.birthDate ?? p?.fecha_nacimiento;
  user.isEmailVerified = user.isEmailVerified ?? user.email_verified;
  user.twoFAEnabled = user.twoFAEnabled ?? user.two_fa_enabled;
  user.createdAt = user.createdAt ?? user.created_at;
  user.updatedAt = user.updatedAt ?? user.updated_at;
  user.lastLogin = user.lastLogin ?? user.last_login;
  user.isActive = user.isActive ?? user.is_active;
  return user as User;
}

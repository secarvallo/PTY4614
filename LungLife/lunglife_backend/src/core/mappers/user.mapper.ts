/**
 * User Data Mapper
 * Mapea datos entre diferentes formatos para compatibilidad frontend-backend
 */

import { IUser } from '../interfaces/repository.interface';

export interface FrontendUser {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  birthDate?: string;
  emailVerified: boolean;
  twoFAEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingConsent?: boolean;
}

export class UserMapper {
  /**
   * Convierte IUser (backend) a formato esperado por frontend
   */
  static toFrontend(user: IUser): FrontendUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.nombre,
      lastName: user.apellido,
      phone: user.phone,
      birthDate: user.fecha_nacimiento,
      emailVerified: user.email_verified,
      twoFAEnabled: user.two_fa_enabled,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLogin: user.last_login_at,
      acceptTerms: user.accept_terms,
      acceptPrivacy: user.accept_privacy,
      marketingConsent: user.marketing_consent
    };
  }

  /**
   * Convierte datos de frontend a formato IUser (backend)
   */
  static fromFrontend(frontendUser: Partial<FrontendUser>): Partial<IUser> {
    const backendUser: Partial<IUser> = {};

    if (frontendUser.id !== undefined) backendUser.id = frontendUser.id;
    if (frontendUser.email !== undefined) backendUser.email = frontendUser.email;
    if (frontendUser.firstName !== undefined) backendUser.nombre = frontendUser.firstName;
    if (frontendUser.lastName !== undefined) backendUser.apellido = frontendUser.lastName;
    if (frontendUser.phone !== undefined) backendUser.phone = frontendUser.phone;
    if (frontendUser.birthDate !== undefined) backendUser.fecha_nacimiento = frontendUser.birthDate;
    if (frontendUser.emailVerified !== undefined) backendUser.email_verified = frontendUser.emailVerified;
    if (frontendUser.twoFAEnabled !== undefined) backendUser.two_fa_enabled = frontendUser.twoFAEnabled;
    if (frontendUser.isActive !== undefined) backendUser.is_active = frontendUser.isActive;
    if (frontendUser.createdAt !== undefined) backendUser.created_at = frontendUser.createdAt;
    if (frontendUser.updatedAt !== undefined) backendUser.updated_at = frontendUser.updatedAt;
    if (frontendUser.lastLogin !== undefined) backendUser.last_login_at = frontendUser.lastLogin;
    if (frontendUser.acceptTerms !== undefined) backendUser.accept_terms = frontendUser.acceptTerms;
    if (frontendUser.acceptPrivacy !== undefined) backendUser.accept_privacy = frontendUser.acceptPrivacy;
    if (frontendUser.marketingConsent !== undefined) backendUser.marketing_consent = frontendUser.marketingConsent;

    return backendUser;
  }

  /**
   * Convierte respuesta de login para compatibilidad con frontend
   */
  static toLoginResponse(user: IUser, tokens: { accessToken: string; refreshToken: string }) {
    return {
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toFrontend(user),
      requiresTwoFA: false, // Por implementar cuando se active 2FA
      sessionId: `session_${user.id}_${Date.now()}` // Temporal
    };
  }

  /**
   * Convierte respuesta de registro para compatibilidad con frontend
   */
  static toRegisterResponse(user: IUser, tokens: { accessToken: string; refreshToken: string }) {
    return {
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toFrontend(user),
      requiresTwoFA: false, // Por implementar cuando se active 2FA
      sessionId: `session_${user.id}_${Date.now()}` // Temporal
    };
  }
}
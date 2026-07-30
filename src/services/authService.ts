import prisma from '../lib/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { AuthResponse, RegisterPayload, LoginPayload, AuthPayload } from '../types';
import logger from '../config/logger';

// Blacklist for revoked refresh tokens (in production, use Redis)
const refreshTokenBlacklist: Set<string> = new Set();

/**
 * O banco guarda MOTORISTA/ANUNCIANTE/ADMIN; o JWT carrega driver/advertiser/admin.
 * Antes isso era um ternário que jogava tudo que não fosse MOTORISTA em
 * 'advertiser' — o que fazia um ADMIN logar como anunciante e nunca alcançar
 * as rotas /admin. Mapeamento explícito para o caso ADMIN não se perder de novo.
 */
const USER_TYPE_TO_TOKEN = {
  MOTORISTA: 'driver',
  ANUNCIANTE: 'advertiser',
  ADMIN: 'admin',
} as const;

function tokenTypeFor(dbType: keyof typeof USER_TYPE_TO_TOKEN | string): string {
  return USER_TYPE_TO_TOKEN[dbType as keyof typeof USER_TYPE_TO_TOKEN] ?? 'advertiser';
}

export class AuthService {
  /**
   * Register a new user with company
   */
  static async register(payload: RegisterPayload): Promise<AuthResponse> {
    const {
      email,
      password,
      type,
      fullName,
      phone,
      companyId,
      companyName,
      tradeName,
      cnpj,
      role,
      industry,
      website,
      cpf,
      city,
      rideApp,
      vehicle,
      plate,
    } = payload;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    const cnpjDigits = cnpj ? cnpj.replace(/\D+/g, '') : undefined;

    // Hash password
    const passwordHash = await hashPassword(password);

    try {
      // Create company if companyId is not provided (each new signup is a tenant)
      let finalCompanyId = companyId;
      if (!finalCompanyId) {
        const company = await prisma.company.create({
          data: {
            // For advertisers the company holds the real business data.
            name: type === 'advertiser' ? companyName || fullName || email : fullName || email,
            email,
            phone: phone || null,
            website: website || null,
            document_number: type === 'advertiser' ? cnpjDigits || null : null,
          },
        });
        finalCompanyId = company.id;
      }

      // Create user in database
      const user = await prisma.user.create({
        data: {
          email,
          password_hash: passwordHash,
          name: fullName || email,
          type: type === 'driver' ? 'MOTORISTA' : 'ANUNCIANTE',
          phone: phone || null,
          company_id: finalCompanyId,
          is_active: true,
          is_verified: false,
        },
      });

      logger.info(`User registered: ${email} (${type})`);

      // Create profile based on user type
      if (type === 'driver') {
        await prisma.motoristProfile.create({
          data: {
            user_id: user.id,
            company_id: finalCompanyId,
            vehicle_info: vehicle || null,
            license_plate: plate ? plate.toUpperCase() : null,
            phone: phone || null,
            cpf: cpf ? cpf.replace(/\D+/g, '') : null,
            city: city || null,
            ride_app: rideApp || null,
            status: 'INATIVO',
          },
        });
      } else if (type === 'advertiser') {
        await prisma.anuncianteProfile.create({
          data: {
            user_id: user.id,
            company_id: finalCompanyId,
            company_name: companyName || fullName || email,
            trade_name: tradeName || null,
            document_number: cnpjDigits || null,
            industry: industry || null,
            website: website || null,
            role: role || null,
            contact_person: fullName || null,
          },
        });
      }

      // Generate tokens
      const authPayload: AuthPayload = {
        id: user.id,
        email: user.email,
        type: type as any,
        companyId: finalCompanyId,
      };

      const token = generateToken(authPayload);
      const refreshToken = generateRefreshToken(authPayload);

      return {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          type: type as any,
          companyId: finalCompanyId,
        },
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(',')
          : String(error.meta?.target || '');
        if (target.includes('license_plate'))
          throw new ConflictError('Esta placa já está cadastrada');
        throw new ConflictError('E-mail já cadastrado');
      }
      throw error;
    }
  }

  /**
   * Login user with email and password
   */
  static async login(payload: LoginPayload): Promise<AuthResponse> {
    const { email, password } = payload;

    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    logger.info(`User logged in: ${email}`);

    // Determine user type
    const userType = tokenTypeFor(user.type);

    // Generate tokens
    const authPayload: AuthPayload = {
      id: user.id,
      email: user.email,
      type: userType as any,
      companyId: user.company_id,
    };

    const token = generateToken(authPayload);
    const refreshToken = generateRefreshToken(authPayload);

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        type: userType as any,
        companyId: user.company_id,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Check if token is blacklisted
    if (refreshTokenBlacklist.has(refreshToken)) {
      throw new AuthenticationError('Token has been revoked');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info(`Token refreshed for user: ${user.email}`);

    // Determine user type
    const userType = tokenTypeFor(user.type);

    // Generate new tokens
    const authPayload: AuthPayload = {
      id: user.id,
      email: user.email,
      type: userType as any,
      companyId: user.company_id,
    };

    const newToken = generateToken(authPayload);
    const newRefreshToken = generateRefreshToken(authPayload);

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        type: userType as any,
        companyId: user.company_id,
      },
    };
  }

  /**
   * Logout user by adding refresh token to blacklist
   */
  static async logout(refreshToken: string): Promise<void> {
    refreshTokenBlacklist.add(refreshToken);
    logger.info('User logged out');
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        company_id: true,
        is_active: true,
        motorista_profile: {
          select: {
            vehicle_info: true,
            total_earnings: true,
            status: true,
            phone: true,
          },
        },
        anunciante_profile: {
          select: {
            company_name: true,
            total_budget: true,
            total_spent: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Determine user type
    const userType = tokenTypeFor(user.type);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      type: userType,
      companyId: user.company_id,
      isActive: user.is_active,
      profile: userType === 'driver' ? user.motorista_profile : user.anunciante_profile,
    };
  }
}

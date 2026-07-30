import { z } from 'zod';
import { UserType } from '../types';
import {
  isValidCNPJ,
  isValidCPF,
  isValidPhoneBR,
  isStrongPassword,
  isValidPlate,
} from './brValidators';

export const RegisterSchema = z
  .object({
    email: z.string().email('E-mail inválido'),
    password: z
      .string()
      .refine(isStrongPassword, 'A senha não atende às regras de segurança'),
    type: z.enum([UserType.DRIVER, UserType.ADVERTISER, UserType.ADMIN]),
    fullName: z.string().min(3, 'Informe o nome completo'),
    phone: z.string().refine(isValidPhoneBR, 'Telefone com DDD inválido'),
    companyId: z.string().optional(),

    // Empresa / anunciante
    companyName: z.string().optional(),
    tradeName: z.string().optional(),
    cnpj: z.string().optional(),
    role: z.string().optional(),
    industry: z.string().optional(),
    website: z.string().optional(),

    // Motorista
    cpf: z.string().optional(),
    city: z.string().optional(),
    rideApp: z.string().optional(),
    vehicle: z.string().optional(),
    plate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === UserType.ADVERTISER) {
      if (!data.companyName || data.companyName.trim().length < 2)
        ctx.addIssue({ code: 'custom', path: ['companyName'], message: 'Informe a razão social' });
      if (!data.cnpj || !isValidCNPJ(data.cnpj))
        ctx.addIssue({ code: 'custom', path: ['cnpj'], message: 'CNPJ inválido' });
      if (!data.role)
        ctx.addIssue({ code: 'custom', path: ['role'], message: 'Informe o cargo do responsável' });
    }
    if (data.type === UserType.DRIVER) {
      if (!data.cpf || !isValidCPF(data.cpf))
        ctx.addIssue({ code: 'custom', path: ['cpf'], message: 'CPF inválido' });
      if (!data.city)
        ctx.addIssue({ code: 'custom', path: ['city'], message: 'Informe a cidade' });
      if (!data.vehicle)
        ctx.addIssue({ code: 'custom', path: ['vehicle'], message: 'Informe o veículo' });
      if (!data.plate || !isValidPlate(data.plate))
        ctx.addIssue({ code: 'custom', path: ['plate'], message: 'Placa inválida' });
    }
  });

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;

import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { asyncHandler, verifyJWT } from '../middleware';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '../utils/validators';
import { isValidCNPJ, onlyDigits } from '../utils/brValidators';

const router = Router();

/**
 * GET /auth/verify-cnpj/:cnpj
 * Confere o dígito verificador e consulta a Receita (via BrasilAPI) para
 * comprovar que a empresa existe e está ativa.
 */
router.get(
  '/verify-cnpj/:cnpj',
  asyncHandler(async (req: Request, res: Response) => {
    const cnpj = onlyDigits(String(req.params.cnpj || ''));

    if (!isValidCNPJ(cnpj)) {
      res.status(200).json({ data: { valid: false, reason: 'CNPJ inválido' } });
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FastLead/1.0 (+https://fastlead-production.up.railway.app)',
        },
      });
      clearTimeout(timeout);

      if (resp.status === 404) {
        res.status(200).json({ data: { valid: true, found: false, reason: 'CNPJ não encontrado na Receita' } });
        return;
      }
      if (!resp.ok) {
        res.status(200).json({ data: { valid: true, found: null, reason: 'Não foi possível consultar a Receita agora' } });
        return;
      }

      const info: any = await resp.json();
      const situacao = String(info.descricao_situacao_cadastral || '').toUpperCase();
      res.status(200).json({
        data: {
          valid: true,
          found: true,
          active: situacao === 'ATIVA',
          razaoSocial: info.razao_social || null,
          nomeFantasia: info.nome_fantasia || null,
          situacao: info.descricao_situacao_cadastral || null,
          uf: info.uf || null,
          municipio: info.municipio || null,
        },
      });
    } catch {
      // Falha de rede não bloqueia — o checksum já garante o formato.
      res.status(200).json({ data: { valid: true, found: null, reason: 'Consulta indisponível' } });
    }
  })
);

/**
 * POST /auth/register
 * Register a new user
 */
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const data = RegisterSchema.parse(req.body);
    const result = await AuthService.register(data);

    res.status(201).json({
      message: 'User registered successfully',
      data: result,
    });
  })
);

/**
 * POST /auth/login
 * Login a user
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const data = LoginSchema.parse(req.body);
    const result = await AuthService.login(data);

    res.status(200).json({
      message: 'Login successful',
      data: result,
    });
  })
);

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const data = RefreshTokenSchema.parse(req.body);
    const result = await AuthService.refreshToken(data.refreshToken);

    res.status(200).json({
      message: 'Token refreshed',
      data: result,
    });
  })
);

/**
 * POST /auth/logout
 * Logout a user
 */
router.post(
  '/logout',
  verifyJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    await AuthService.logout(refreshToken);

    res.status(200).json({
      message: 'Logout successful',
    });
  })
);

/**
 * GET /auth/me
 * Get current user info
 */
router.get(
  '/me',
  verifyJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await AuthService.getUserById(req.user!.id);

    res.status(200).json({
      data: user,
    });
  })
);

export default router;

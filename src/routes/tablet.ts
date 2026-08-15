import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware';
import { TabletService } from '../services/tabletService';
import { TelemetryService } from '../services/telemetryService';
import { TrackingService } from '../services/trackingService';
import { ValidationError } from '../utils/errors';

const router = Router();

/**
 * O tablet não usa JWT de usuário: ele se autentica com um device token
 * emitido no pareamento. Assim nenhuma credencial do motorista fica salva
 * num aparelho que mora dentro do carro.
 */
function deviceToken(req: Request): string {
  const token = req.headers['x-device-token'];
  if (!token || typeof token !== 'string') {
    throw new ValidationError('Tablet não pareado', 'TABLET_NOT_PAIRED');
  }
  return token;
}

/** POST /tablet/pair — tablet envia o código de 6 dígitos e recebe seu token */
router.post(
  '/pair',
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body || {};
    if (!code || !/^\d{6}$/.test(String(code).trim())) {
      res.status(400).json({ error: 'Informe o código de 6 dígitos' });
      return;
    }
    const result = await TabletService.pair(String(code), req.headers['user-agent']);
    res.json({ data: result });
  })
);

/** GET /tablet/playlist — o que roda na tela deste carro */
router.get(
  '/playlist',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await TabletService.playlist(deviceToken(req)) });
  })
);

/** POST /tablet/impressions — o tablet reporta o que já exibiu */
router.post(
  '/impressions',
  asyncHandler(async (req: Request, res: Response) => {
    const device = await TabletService.deviceFromToken(deviceToken(req));
    const sessao = await TabletService.currentSession(device);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const result = await TrackingService.recordImpressions(
      device.id,
      device.motorista_id!,
      items.map((i: { campaignId: string; durationMs?: number }) => ({
        campaignId: i.campaignId,
        durationMs: i.durationMs,
      })),
      sessao?.id
    );
    res.json({ data: result });
  })
);

/**
 * POST /tablet/telemetry — o tablet reporta onde esteve e se estava andando.
 *
 * Chega em lote: o aparelho acumula os pings e envia de tempos em tempos, para
 * não gastar bateria e 4G do motorista com uma requisição a cada leitura. Se
 * ficou sem sinal, manda o acumulado quando voltar — por isso cada ping traz
 * o próprio horário em vez de valer o horário da requisição.
 */
router.post(
  '/telemetry',
  asyncHandler(async (req: Request, res: Response) => {
    const pings = Array.isArray(req.body?.pings) ? req.body.pings : [];
    // Teto por lote: um tablet offline por horas não deve conseguir despejar
    // dezenas de milhares de pontos numa requisição só.
    if (pings.length > 500) {
      throw new ValidationError('Lote grande demais', 'TELEMETRY_BATCH_TOO_LARGE');
    }
    const status = await TelemetryService.recordForDevice(deviceToken(req), pings);
    res.json({ data: status });
  })
);

/**
 * GET /tablet/status — o tablet pergunta se a jornada dele está valendo.
 *
 * O motorista é avisado de propósito quando cai em suspeita: deixar de pagar
 * alguém sem dizer por quê é pior do que um fraudador aprender o limiar.
 */
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ data: await TelemetryService.statusForDevice(deviceToken(req)) });
  })
);

/**
 * POST /tablet/session/end — motorista encerra a jornada na tela do tablet.
 * Fecha a jornada, devolve o resumo do que rodou e solta o aparelho: o tablet
 * volta a pedir código de pareamento.
 */
router.post(
  '/session/end',
  asyncHandler(async (req: Request, res: Response) => {
    const resumo = await TabletService.endSession(deviceToken(req));
    res.json({ data: resumo });
  })
);

export default router;

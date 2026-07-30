import QRCode from 'qrcode';
import config from '../config/config';
import logger from '../config/logger';

/**
 * QR codes da FastLead apontam SEMPRE para a rota pública de redirect
 * (`/r/:campaignId`), nunca direto para o anunciante. É esse salto que
 * permite contar a divulgação: cada leitura vira um ScanEvent antes de
 * o passageiro seguir para o destino.
 *
 * O parâmetro `m` (motorista) atribui o scan a quem estava rodando,
 * e `d` (device) identifica o tablet específico.
 */
export class QRService {
  /** Monta a URL rastreável que vai dentro do QR. */
  static buildTrackingUrl(campaignId: string, motoristaId?: string, deviceId?: string): string {
    const url = new URL(`${config.qrBaseUrl}/r/${campaignId}`);
    if (motoristaId) url.searchParams.set('m', motoristaId);
    if (deviceId) url.searchParams.set('d', deviceId);
    return url.toString();
  }

  /**
   * Gera o QR de uma campanha. Quando `motoristaId` é informado o QR fica
   * atribuído àquele motorista — é assim que o tablet de cada carro gera
   * leads que o motorista consegue provar que foram dele.
   */
  static async generateQRCode(
    campaignId: string,
    motoristaId?: string,
    deviceId?: string
  ): Promise<{ qrCodeData: string; qrCodeImageUrl: string }> {
    try {
      const qrUrl = QRService.buildTrackingUrl(campaignId, motoristaId, deviceId);

      const qrCodeImage = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'M', // M basta e deixa o QR menos denso -> lê de mais longe
        margin: 2,
        width: 512, // Passageiro fica a ~1m do tablet; QR grande lê mais rápido
        color: { dark: '#0B1D3A', light: '#FFFFFF' },
      });

      return { qrCodeData: qrUrl, qrCodeImageUrl: qrCodeImage };
    } catch (error) {
      logger.error(`Erro ao gerar QR code: ${error}`);
      throw new Error('Falha ao gerar QR code');
    }
  }

  /** PNG do QR para download/impressão. */
  static async generateQRCodeFile(campaignId: string, motoristaId?: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(QRService.buildTrackingUrl(campaignId, motoristaId), {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 1024,
      });
    } catch (error) {
      logger.error(`Erro ao gerar arquivo QR code: ${error}`);
      throw new Error('Falha ao gerar arquivo QR code');
    }
  }

  /** Um QR é nosso se aponta para a base pública configurada. */
  static validateQRCodeData(qrData: string): boolean {
    try {
      return new URL(qrData).origin === new URL(config.qrBaseUrl).origin;
    } catch {
      return false;
    }
  }
}

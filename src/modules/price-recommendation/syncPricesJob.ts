import cron from 'node-cron';
import { PriceRecommendationService } from './priceRecommendation.service';
import { logger } from '../../lib/logger';

const service = new PriceRecommendationService();

/** Tenta AMA; se falhar ou vier abaixo do mínimo, usa Agrolink. */
export async function syncPricesOnce(minItems = 10, overwriteAgrolink = false) {
  try {
    const amaItems = await service.extractData();
    const amaCount = amaItems.length;
    logger.info(`[Prices Sync][AMA] itens extraídos: ${amaCount}`);

    if (amaCount >= minItems) {
      return { ok: true, source: 'AMA', amaCount, agrolink: null };
    }
    logger.info(`[Prices Sync] AMA abaixo do mínimo (${amaCount} < ${minItems}). Fallback Agrolink...`);
  } catch (e: any) {
    logger.info('[Prices Sync] AMA falhou. Fallback Agrolink...', e?.message || e);
  }

  const { coletados, gravados } = await service.materializeFromAgrolink(overwriteAgrolink);
  logger.info(`[Prices Sync][Agrolink] coletados=${coletados} gravados=${gravados}`);

  return { ok: true, source: 'AGROLINK', amaCount: 0, agrolink: { coletados, gravados } };
}

/** Cron diário — 12:30 America/Recife */
cron.schedule(
  '30 12 * * *',
  async () => {
    logger.info('[Prices Sync] job iniciado');
    try {
      const min = Number(process.env.AMA_MIN_ITEMS ?? 10);
      const overwrite = (process.env.AGROLINK_OVERWRITE ?? 'false') === 'true';
      const r = await syncPricesOnce(min, overwrite);
      logger.info('[Prices Sync] resultado:', r);
    } catch (err: any) {
      logger.error('[Prices Sync] erro:', err?.message || err);
    }
  },
  { timezone: 'America/Recife' }
);

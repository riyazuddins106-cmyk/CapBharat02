import { db } from '../config/database.js';
import { payoutRequests, payoutRuns, platformSettings, professionals } from '../database/schema/index.js';
import { and, eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { arePartnerPayoutsPaused, createRazorpayUpiPayout } from './razorpayPayout.service.js';

export type PayoutScheduleConfig = {
  enabled: boolean;
  payoutsPaused: boolean;
  frequency: 'weekly' | 'monthly';
  dayOfWeek: number;
  dayOfMonth: number;
  runHourUtc: number;
  maxPayoutsPerRun: number;
  maxAmountPerRun: number;
};

const DEFAULT_CONFIG: PayoutScheduleConfig = {
  enabled: false,
  payoutsPaused: false,
  frequency: 'weekly',
  dayOfWeek: 5,
  dayOfMonth: 1,
  runHourUtc: 3,
  maxPayoutsPerRun: 100,
  maxAmountPerRun: 100000,
};

const LOCK_KEY = 781_443_219;
let schedulerTimer: NodeJS.Timeout | null = null;
let running = false;

async function getConfig(): Promise<PayoutScheduleConfig> {
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, 'payout_config'));
  if (!row) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(row.value) as Partial<PayoutScheduleConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      maxPayoutsPerRun: Math.min(500, Math.max(1, Number(parsed.maxPayoutsPerRun ?? DEFAULT_CONFIG.maxPayoutsPerRun))),
      maxAmountPerRun: Math.min(10_000_000, Math.max(100, Number(parsed.maxAmountPerRun ?? DEFAULT_CONFIG.maxAmountPerRun))),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function scheduleKey(now: Date, config: PayoutScheduleConfig): string | null {
  if (!config.enabled) return null;
  if (config.frequency === 'weekly') {
    if (now.getUTCDay() !== config.dayOfWeek || now.getUTCHours() < config.runHourUtc) return null;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay()));
    return `weekly-${weekStart.toISOString().slice(0, 10)}`;
  }
  if (now.getUTCDate() !== config.dayOfMonth || now.getUTCHours() < config.runHourUtc) return null;
  return `monthly-${now.toISOString().slice(0, 7)}`;
}

type ClaimedPayout = {
  id: string;
  professionalId: string;
  amount: number;
  upiId: string;
};

async function claimPayouts(trigger: 'scheduled' | 'manual', scheduleKeyValue: string | null, config: PayoutScheduleConfig) {
  return db.transaction(async (tx) => {
    const lockRows = await tx.execute(sql`SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS locked`);
    const locked = Boolean((lockRows as any[])[0]?.locked);
    if (!locked) return null;

    // Recover requests left in-flight by a process restart or network timeout.
    await tx.execute(sql`
      UPDATE payout_requests
      SET status = 'approved',
          processing_started_at = NULL,
          provider_status = 'retryable',
          failure_reason = COALESCE(failure_reason, 'Recovered after an interrupted payout run.')
      WHERE status = 'processing'
        AND processing_started_at < NOW() - INTERVAL '15 minutes'
    `);

    if (scheduleKeyValue) {
      const [existingRun] = await tx.select({ id: payoutRuns.id })
        .from(payoutRuns)
        .where(eq(payoutRuns.scheduleKey, scheduleKeyValue))
        .limit(1);
      if (existingRun) return null;
    }

    const candidateRows = await tx.execute(sql`
      SELECT
        pr.id,
        pr.professional_id AS "professionalId",
        pr.amount,
        p.payout_upi_id AS "upiId"
      FROM payout_requests pr
      INNER JOIN professionals p ON p.id = pr.professional_id
      WHERE pr.status = 'approved'
        AND p.payout_upi_id IS NOT NULL
        AND p.payout_upi_id <> ''
      ORDER BY pr.requested_at ASC
      FOR UPDATE OF pr SKIP LOCKED
      LIMIT ${config.maxPayoutsPerRun}
    `);

    const candidates = (candidateRows as any[]).map((row) => ({
      id: String(row.id),
      professionalId: String(row.professionalId),
      amount: Number(row.amount),
      upiId: String(row.upiId),
    })) as ClaimedPayout[];

    const selected: ClaimedPayout[] = [];
    let selectedAmount = 0;
    for (const candidate of candidates) {
      if (selected.length >= config.maxPayoutsPerRun) break;
      if (selectedAmount + candidate.amount > config.maxAmountPerRun) continue;
      selected.push(candidate);
      selectedAmount += candidate.amount;
    }

    const [run] = await tx.insert(payoutRuns).values({
      trigger,
      scheduleKey: scheduleKeyValue,
      status: selected.length ? 'running' : 'completed',
      requestedCount: selected.length,
      requestedAmount: selectedAmount,
      completedAt: selected.length ? null : new Date(),
    }).returning();

    if (selected.length) {
      await tx.update(payoutRequests)
        .set({
          status: 'processing',
          processingStartedAt: new Date(),
          providerStatus: 'queued',
          failureReason: null,
        })
        .where(inArray(payoutRequests.id, selected.map((payout) => payout.id)));
    }

    return { run, selected };
  });
}

async function processRun(runId: string, selected: ClaimedPayout[]) {
  let successCount = 0;
  let failureCount = 0;
  let paidAmount = 0;

  for (const payout of selected) {
    try {
      const provider = await createRazorpayUpiPayout({
        payoutRequestId: payout.id,
        professionalId: payout.professionalId,
        amountRupees: payout.amount,
        upiId: payout.upiId,
        note: `Scheduled partner payout (${runId})`,
      });

      await db.update(payoutRequests)
        .set({
          status: 'paid',
          resolvedAt: new Date(),
          processingStartedAt: null,
          providerPayoutId: provider.id,
          providerStatus: provider.status,
          failureReason: null,
        })
        .where(and(eq(payoutRequests.id, payout.id), eq(payoutRequests.status, 'processing')));
      successCount += 1;
      paidAmount += payout.amount;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'RazorpayX payout failed.';
      await db.update(payoutRequests)
        .set({
          status: 'pending',
          processingStartedAt: null,
          providerStatus: 'failed',
          failureReason: message,
        })
        .where(and(eq(payoutRequests.id, payout.id), eq(payoutRequests.status, 'processing')));
      failureCount += 1;
    }
  }

  await db.update(payoutRuns)
    .set({
      status: failureCount === selected.length ? 'failed' : failureCount ? 'partial' : 'completed',
      successCount,
      failureCount,
      paidAmount,
      completedAt: new Date(),
    })
    .where(eq(payoutRuns.id, runId));

  return { runId, successCount, failureCount, paidAmount };
}

export async function runPayouts(trigger: 'scheduled' | 'manual', now = new Date()) {
  if (running) return { skipped: true, reason: 'another payout run is already active' };
  const config = await getConfig();
  if (config.payoutsPaused || await arePartnerPayoutsPaused()) {
    return { skipped: true, reason: 'partner payouts are temporarily paused' };
  }
  const key = trigger === 'scheduled' ? scheduleKey(now, config) : null;
  if (trigger === 'scheduled' && !key) return { skipped: true, reason: 'not due' };
  if (trigger === 'manual' && !config.enabled) return { skipped: true, reason: 'automatic payouts are disabled' };

  running = true;
  try {
    const claimed = await claimPayouts(trigger, key, config);
    if (!claimed) return { skipped: true, reason: 'another worker owns the payout run or it already ran' };
    if (!claimed.selected.length) return { runId: claimed.run.id, successCount: 0, failureCount: 0, paidAmount: 0 };
    return await processRun(claimed.run.id, claimed.selected);
  } finally {
    running = false;
  }
}

export function startPayoutScheduler() {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(() => {
    void runPayouts('scheduled').catch((error) => {
      console.error('[payoutScheduler] scheduled run failed', error);
    });
  }, 60_000);
  void runPayouts('scheduled').catch((error) => {
    console.error('[payoutScheduler] initial scheduled check failed', error);
  });
}

export function stopPayoutScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}

export { DEFAULT_CONFIG as DEFAULT_PAYOUT_SCHEDULE_CONFIG };
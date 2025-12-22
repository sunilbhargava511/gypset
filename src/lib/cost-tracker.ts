import prisma from './prisma';

// Pricing as of December 2024
const PRICING = {
  google_gemini: {
    // Gemini pricing (per 1M tokens)
    'gemini-2.5-flash': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
    'gemini-2.5-pro': { input: 1.25 / 1_000_000, output: 10.0 / 1_000_000 },
    'gemini-2.0-flash': { input: 0.10 / 1_000_000, output: 0.40 / 1_000_000 },
    'gemini-2.0-flash-exp': { input: 0.0 / 1_000_000, output: 0.0 / 1_000_000 }, // Free during preview
    'gemini-1.5-flash': { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
    'gemini-1.5-pro': { input: 1.25 / 1_000_000, output: 5.0 / 1_000_000 },
  } as Record<string, { input: number; output: number }>,
};

export interface CostEntry {
  userId: string;
  service: 'google_gemini';
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  audioDurationSeconds?: number;
  model?: string;
  locationId?: string;
  requestMetadata?: object;
}

export function calculateCost(entry: CostEntry): number {
  let cost = 0;

  if (entry.service === 'google_gemini' && entry.model) {
    const pricing = PRICING.google_gemini[entry.model];
    if (pricing && entry.inputTokens !== undefined && entry.outputTokens !== undefined) {
      cost = entry.inputTokens * pricing.input + entry.outputTokens * pricing.output;
    }
  }

  return cost;
}

export async function trackApiUsage(entry: CostEntry): Promise<void> {
  const costUsd = calculateCost(entry);

  await prisma.apiUsageLog.create({
    data: {
      userId: entry.userId,
      service: entry.service,
      operation: entry.operation,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      audioDurationSeconds: entry.audioDurationSeconds,
      costUsd,
      model: entry.model,
      locationId: entry.locationId,
      requestMetadata: entry.requestMetadata,
    },
  });
}

export async function getUserMonthlyCost(userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await prisma.apiUsageLog.aggregate({
    where: {
      userId,
      createdAt: { gte: startOfMonth },
    },
    _sum: { costUsd: true },
  });

  return result._sum.costUsd || 0;
}

export async function getTotalMonthlyCost(): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await prisma.apiUsageLog.aggregate({
    where: {
      createdAt: { gte: startOfMonth },
    },
    _sum: { costUsd: true },
  });

  return result._sum.costUsd || 0;
}

import { BatchWithDetails } from './types';

export interface WarehouseAiInsight {
  riskScore: number; // 0-100
  label: 'Low' | 'Medium' | 'High';
  recommendations: string[];
}

export function getWarehouseInsights(batch: BatchWithDetails): WarehouseAiInsight {
  const remainingDays = batch.retailStatus?.remainingDays ?? 0;
  const quantity = batch.quantity || 0;
  const storageType = batch.storage?.storageType || 'Normal';

  let riskScore = 0;

  if (remainingDays <= 0) {
    riskScore = 100;
  } else if (remainingDays <= 2) {
    riskScore = 90;
  } else if (remainingDays <= 5) {
    riskScore = 70;
  } else {
    riskScore = 30;
  }

  if (storageType === 'Normal' && remainingDays <= 3) {
    riskScore = Math.min(100, riskScore + 10);
  }

  if (quantity > 500) {
    riskScore = Math.min(100, riskScore + 10);
  }

  let label: WarehouseAiInsight['label'] = 'Low';
  if (riskScore >= 80) label = 'High';
  else if (riskScore >= 50) label = 'Medium';

  const recommendations: string[] = [];

  if (riskScore >= 80) {
    recommendations.push('Prioritize this batch for dispatch (highest FIFO priority).');
    if (storageType === 'Normal') {
      recommendations.push('If possible, move to cold storage to extend shelf life.');
    }
    recommendations.push('Consider promotional pricing or fast channels to clear stock.');
  } else if (riskScore >= 50) {
    recommendations.push('Monitor closely and schedule this batch for the next outbound orders.');
  } else {
    recommendations.push('Batch is healthy. Keep following standard FIFO.');
  }

  return { riskScore, label, recommendations };
}


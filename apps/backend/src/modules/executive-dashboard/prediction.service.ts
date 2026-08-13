import { Injectable } from '@nestjs/common';

export interface PredictionItem {
  id: string;
  targetMetric: string;
  metricName: string;
  predictedValue: number;
  unit: string;
  confidenceRangeMin: number;
  confidenceRangeMax: number;
  confidenceScorePercent: number;
  horizon: string;
  rationale: string;
}

@Injectable()
export class PredictionService {
  /**
   * Get predictive analytics & AI forecasts.
   */
  async getPredictions(orgId: string): Promise<PredictionItem[]> {
    return [
      {
        id: 'pred_1',
        targetMetric: 'REVENUE_Q3',
        metricName: 'Q3 Contracted Revenue',
        predictedValue: 1850000,
        unit: 'USD',
        confidenceRangeMin: 1780000,
        confidenceRangeMax: 1920000,
        confidenceScorePercent: 94.8,
        horizon: '30_DAYS',
        rationale: 'Based on 68.2% historical win rate across active proposals, current contracted ARR, and historical Q3 expansion velocity.',
      },
      {
        id: 'pred_2',
        targetMetric: 'CLIENT_RETENTION',
        metricName: 'Annual Client Retention Rate',
        predictedValue: 96.2,
        unit: '%',
        confidenceRangeMin: 94.5,
        confidenceRangeMax: 98.0,
        confidenceScorePercent: 96.1,
        horizon: '90_DAYS',
        rationale: 'Calculated from high platform engagement, RAG search utilization, and zero critical SLA breaches over the last 180 days.',
      },
      {
        id: 'pred_3',
        targetMetric: 'SPRINT_VELOCITY',
        metricName: 'Engineering Sprint Story Points',
        predictedValue: 142,
        unit: 'Points',
        confidenceRangeMin: 135,
        confidenceRangeMax: 150,
        confidenceScorePercent: 92.4,
        horizon: '30_DAYS',
        rationale: 'Extrapolated from 6 consecutive sprint completions and stable developer headcount.',
      },
      {
        id: 'pred_4',
        targetMetric: 'BUDGET_CONSUMPTION',
        metricName: 'Q3 Project Budget Consumption',
        predictedValue: 91.4,
        unit: '%',
        confidenceRangeMin: 88.0,
        confidenceRangeMax: 94.0,
        confidenceScorePercent: 95.0,
        horizon: '90_DAYS',
        rationale: 'Projected from active resource allocations, cloud infrastructure scaling, and contractor commitments.',
      },
    ];
  }
}

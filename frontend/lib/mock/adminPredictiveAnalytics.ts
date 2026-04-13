import type { HeatMapPoint } from '@/components/dashboard/admin/PredictiveHeatMap';
import type { OutbreakForecastPoint } from '@/components/dashboard/admin/OutbreakForecastChart';

export const MOCK_ADMIN_HEAT_MAP_POINTS: HeatMapPoint[] = [
  {
    id: 'ceas',
    department: 'College of Education, Arts, and Sciences',
    activeCases: 19,
    riskScore: 92,
    riskLevel: 'High',
    recommendedAction: 'Deploy additional nurse coverage during afternoon clinic hours.',
  },
  {
    id: 'cba',
    department: 'College of Business and Accountancy',
    activeCases: 14,
    riskScore: 71,
    riskLevel: 'High',
    recommendedAction: 'Start class-level symptom checks and send hydration advisory.',
  },
  {
    id: 'ccs',
    department: 'College of Computer Studies',
    activeCases: 9,
    riskScore: 49,
    riskLevel: 'Medium',
    recommendedAction: 'Monitor absentee spikes and keep teleconsult slots open.',
  },
  {
    id: 'cahs',
    department: 'College of Allied Health Studies',
    activeCases: 6,
    riskScore: 33,
    riskLevel: 'Low',
    recommendedAction: 'Continue routine monitoring and weekly wellness reminders.',
  },
];

export const MOCK_ADMIN_OUTBREAK_FORECAST: OutbreakForecastPoint[] = [
  {
    period: 'Jan',
    observedCases: 26,
    predictedCases: 29,
    lowerBound: 24,
    upperBound: 33,
    staffingRecommendation: '3 clinic staff per shift',
    actionNote: 'Prepare influenza kits before the first week of classes.',
  },
  {
    period: 'Feb',
    observedCases: 28,
    predictedCases: 31,
    lowerBound: 26,
    upperBound: 35,
    staffingRecommendation: '3 clinic staff per shift',
    actionNote: 'Increase triage support during exam week.',
  },
  {
    period: 'Mar',
    observedCases: 35,
    predictedCases: 39,
    lowerBound: 33,
    upperBound: 45,
    staffingRecommendation: '4 clinic staff per shift',
    actionNote: 'Coordinate with guidance office for mental health referrals.',
  },
  {
    period: 'Apr',
    observedCases: 31,
    predictedCases: 34,
    lowerBound: 29,
    upperBound: 40,
    staffingRecommendation: '3 clinic staff per shift',
    actionNote: 'Run targeted respiratory-awareness bulletin for high-risk blocks.',
  },
];

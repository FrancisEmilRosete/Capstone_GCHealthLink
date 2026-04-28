'use client';

export type InsightRole = 'staff' | 'doctor' | 'dental' | 'student';

/**
 * trendSentiment controls badge color independently of direction:
 *  - 'positive' → green  (e.g. "clearances completed on time")
 *  - 'warning'  → amber  (e.g. "visit volume rising — prepare staff")
 *  - 'alert'    → red    (e.g. "supply depleting")
 *  - 'neutral'  → gray   (informational only)
 */
type TrendSentiment = 'positive' | 'warning' | 'alert' | 'neutral';

interface Insight {
  icon: string;
  label: string;
  value: string;
  detail: string;
  trend?: 'up' | 'down' | 'stable';
  trendSentiment?: TrendSentiment;
  trendLabel?: string;   // e.g. "Rising", "Declining", "Stable"
  accent: string;
}

function getRoleInsights(role: InsightRole): { title: string; description: string; insights: Insight[] } {
  switch (role) {
    case 'staff':
      return {
        title: 'Clinic Predictive Insights',
        description: 'Forecasted clinic activity for the next 7 days based on recent patterns.',
        insights: [
          {
            icon: '📈',
            label: 'Visit Volume Trend',
            value: '+12% expected',
            detail: 'Higher than last week — prepare additional triage staff.',
            trend: 'up', trendSentiment: 'warning', trendLabel: 'Rising',
            accent: 'teal',
          },
          {
            icon: '📅',
            label: 'Busiest Day Forecast',
            value: 'Monday',
            detail: 'Historically the highest walk-in day. Plan for peak queue.',
            trend: 'stable', trendSentiment: 'neutral', trendLabel: 'Stable',
            accent: 'blue',
          },
          {
            icon: '🤒',
            label: 'Top Health Concern',
            value: 'Flu / Fever',
            detail: 'Seasonal respiratory cases expected to spike this week.',
            trend: 'up', trendSentiment: 'alert', trendLabel: 'Increasing',
            accent: 'orange',
          },
          {
            icon: '💊',
            label: 'Supply Alert Forecast',
            value: 'Paracetamol',
            detail: 'Stock depletion estimated within 5 days at current rate.',
            trend: 'down', trendSentiment: 'alert', trendLabel: 'Depleting',
            accent: 'red',
          },
        ],
      };

    case 'doctor':
      return {
        title: 'Patient Load Insights',
        description: 'AI-assisted forecast of incoming consultations and review priorities.',
        insights: [
          {
            icon: '🧑‍⚕️',
            label: 'Patient Load Forecast',
            value: '18 patients',
            detail: 'Projected consultations for the next 3 days.',
            trend: 'up', trendSentiment: 'warning', trendLabel: 'Increasing',
            accent: 'teal',
          },
          {
            icon: '📋',
            label: 'Pending Reviews',
            value: '4 records',
            detail: 'Students with recent visits needing follow-up review.',
            trend: 'stable', trendSentiment: 'neutral', trendLabel: 'No change',
            accent: 'indigo',
          },
          {
            icon: '🚨',
            label: 'High-Risk Alerts',
            value: '2 flagged',
            detail: 'Students with chronic conditions due for monitoring.',
            trend: 'stable', trendSentiment: 'alert', trendLabel: 'Needs attention',
            accent: 'red',
          },
          {
            icon: '💉',
            label: 'Top Symptom Forecast',
            value: 'Headache / Fever',
            detail: 'Most reported complaints expected in the coming days.',
            trend: 'up', trendSentiment: 'warning', trendLabel: 'Rising',
            accent: 'orange',
          },
        ],
      };

    case 'dental':
      return {
        title: 'Dental Queue Insights',
        description: 'Predicted dental appointment load and queue trends.',
        insights: [
          {
            icon: '🦷',
            label: 'Queue Length Forecast',
            value: '11 patients / day',
            detail: 'Estimated average daily dental patients this week.',
            trend: 'up', trendSentiment: 'warning', trendLabel: 'Above average',
            accent: 'teal',
          },
          {
            icon: '📅',
            label: 'Busiest Day Forecast',
            value: 'Friday',
            detail: 'Most appointments expected on Fridays — prepare accordingly.',
            trend: 'stable', trendSentiment: 'neutral', trendLabel: 'Consistent',
            accent: 'blue',
          },
          {
            icon: '🦠',
            label: 'Top Dental Concern',
            value: 'Toothache',
            detail: 'Highest expected complaint type this week.',
            trend: 'up', trendSentiment: 'warning', trendLabel: 'Increasing',
            accent: 'orange',
          },
          {
            icon: '✅',
            label: 'Clearance Requests',
            value: '+20% rise',
            detail: 'End-of-semester dental clearance requests are increasing.',
            trend: 'up', trendSentiment: 'warning', trendLabel: 'Seasonal spike',
            accent: 'purple',
          },
        ],
      };

    case 'student':
      return {
        title: 'Your Health Insights',
        description: 'Personalized health forecasts and reminders based on your clinic activity.',
        insights: [
          {
            icon: '🗓️',
            label: 'Next Check-up Due',
            value: 'In ~30 days',
            detail: 'Annual physical examination is approaching. Book in advance.',
            trend: 'stable', trendSentiment: 'warning', trendLabel: 'Upcoming',
            accent: 'teal',
          },
          {
            icon: '📊',
            label: 'Visit Frequency',
            value: 'Below average',
            detail: 'You have had fewer visits than average this semester.',
            trend: 'down', trendSentiment: 'neutral', trendLabel: 'Low activity',
            accent: 'blue',
          },
          {
            icon: '💊',
            label: 'Allergy Reminder',
            value: 'Update needed',
            detail: 'Ensure your allergy information is up to date in your record.',
            trend: 'stable', trendSentiment: 'alert', trendLabel: 'Action required',
            accent: 'orange',
          },
          {
            icon: '🏃',
            label: 'Wellness Tip',
            value: 'Stay hydrated',
            detail: 'Clinic data shows a rise in dehydration-related visits this season.',
            trend: 'stable', trendSentiment: 'neutral', trendLabel: 'General advice',
            accent: 'green',
          },
        ],
      };
  }
}

const ACCENT_CLASSES: Record<string, { bg: string; text: string; badge: string }> = {
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   badge: 'bg-teal-100 text-teal-800' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-800' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-100 text-red-800' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  badge: 'bg-green-100 text-green-800' },
};

const TREND_ICON: Record<string, string> = {
  up: '↑',
  down: '↓',
  stable: '→',
};

/**
 * Sentiment badge styling (independent of up/down direction).
 * Communicates the *meaning* of the change, not just direction.
 */
const SENTIMENT_COLOR: Record<TrendSentiment, string> = {
  positive: 'text-emerald-600 font-semibold',
  warning:  'text-amber-600 font-semibold',
  alert:    'text-red-600 font-semibold',
  neutral:  'text-slate-500',
};

interface PredictiveInsightsCardProps {
  role: InsightRole;
  className?: string;
}

export default function PredictiveInsightsCard({ role, className = '' }: PredictiveInsightsCardProps) {
  const { title, description, insights } = getRoleInsights(role);

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`.trim()}>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
            AI Forecast
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((insight) => {
          const classes = ACCENT_CLASSES[insight.accent] ?? ACCENT_CLASSES.teal;
          return (
            <div
              key={insight.label}
              className={`rounded-xl border border-gray-100 ${classes.bg} p-3.5 flex flex-col gap-1`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{insight.icon}</span>
                  <span className="text-xs font-semibold text-gray-600">{insight.label}</span>
                </div>
                {insight.trend && insight.trendSentiment && (
                  <span className={`text-xs font-semibold ${SENTIMENT_COLOR[insight.trendSentiment]}`}>
                    {TREND_ICON[insight.trend]} {insight.trendLabel}
                  </span>
                )}
              </div>
              <p className={`text-base font-bold ${classes.text}`}>{insight.value}</p>
              <p className="text-xs text-gray-500 leading-snug">{insight.detail}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-gray-400 text-right">
        Predictions are based on historical clinic data trends and may not reflect real-time changes.
      </p>
    </section>
  );
}

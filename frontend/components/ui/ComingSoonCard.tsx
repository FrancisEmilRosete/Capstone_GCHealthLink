import { Wrench, Check } from 'lucide-react';

/**
 * COMING SOON CARD
 * A placeholder card for pages still under development.
 *
 * Usage:
 *   <ComingSoonCard
 *     title="Physical Examination"
 *     description="Record and manage patient exam results."
 *     features={['Vital signs', 'BMI', 'AI anomaly flagging']}
 *   />
 */

interface ComingSoonCardProps {
  title: string;
  description: string;
  features?: string[];
}

export function ComingSoonCard({ title, description, features = [] }: ComingSoonCardProps) {
  return (
    <div className="max-w-2xl mx-4 sm:mx-auto mt-8 sm:mt-12">
      <div className="card text-center p-6 sm:p-10">

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-[var(--radius-xl)] flex items-center justify-center mx-auto mb-5 text-white"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary-gradient-from)), hsl(var(--primary-gradient-to)))' }}
          aria-hidden="true"
        >
          <Wrench className="w-7 h-7" />
        </div>

        <h1 className="text-h2 text-[hsl(var(--foreground))] mb-2">{title}</h1>
        <p className="text-sm text-[hsl(var(--muted))] mb-6 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>

        {/* Status pill */}
        <span className="inline-flex items-center gap-1.5 bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))] text-xs font-bold px-3 py-1.5 rounded-[var(--radius-full)] mb-6">
          Under Development
        </span>

        {/* Feature list */}
        {features.length > 0 && (
          <div className="text-left border-t border-[hsl(var(--border))] pt-6 mt-2">
            <p className="text-[10px] font-semibold text-[hsl(var(--muted))] uppercase tracking-[0.08em] mb-3">
              Planned Features
            </p>
            <ul className="space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-[hsl(var(--foreground))]">
                  <Check
                    className="h-4 w-4 text-[hsl(var(--primary))] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}


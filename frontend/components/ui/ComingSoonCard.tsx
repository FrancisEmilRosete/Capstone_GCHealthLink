/**
 * COMING SOON CARD
 * ──────────────────────────────────────────────────────────────
 * A reusable placeholder card shown on pages that are still
 * being built. Displays a title, description, and feature list
 * so developers know exactly what goes here.
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

      {/* Icon + header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          {/* Construction icon */}
          <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm mb-6">{description}</p>

        {/* Status pill */}
        <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
          🚧 Under Development
        </span>

        {/* Feature list */}
        {features.length > 0 && (
          <div className="text-left border-t border-gray-100 pt-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Planned Features
            </p>
            <ul className="space-y-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-1 text-teal-400 shrink-0">✓</span>
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

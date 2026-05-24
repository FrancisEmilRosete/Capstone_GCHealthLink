'use client';

import AvailabilityCalendarManager from '@/components/dashboard/shared/AvailabilityCalendarManager';

export default function DentalCalendarPage() {
  return (
    <AvailabilityCalendarManager
      scope="dental"
      title="Dentist Availability Calendar"
      subtitle="Set dentist availability for dental check-up appointments."
    />
  );
}

'use client';

import AvailabilityCalendarManager from '@/components/dashboard/shared/AvailabilityCalendarManager';

export default function DoctorCalendarPage() {
  return (
    <AvailabilityCalendarManager
      scope="medical"
      title="Doctor Availability Calendar"
      subtitle="Set your medical appointment availability. This calendar is synced with the nurse dashboard."
    />
  );
}

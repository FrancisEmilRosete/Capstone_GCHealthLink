'use client';

import AvailabilityCalendarManager from '@/components/dashboard/shared/AvailabilityCalendarManager';

export default function StaffCalendarPage() {
  return (
    <AvailabilityCalendarManager
      scope="medical"
      title="Medical Availability Calendar"
      subtitle="Set doctor availability for medical consultation and medical clearance appointments. This calendar is shared with the doctor dashboard."
    />
  );
}

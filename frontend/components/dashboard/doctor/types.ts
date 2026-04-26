export interface QueueItem {
  id: string;
  preferredDate: string;
  preferredTime: string;
  serviceType?: string;
  symptoms: string;
  status: string;
  studentProfile: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    courseDept: string;
    medicalHistory: {
      asthmaEnc?: string | null;
      diabetesEnc?: string | null;
      allergyEnc?: string | null;
    } | null;
  };
}

export interface VisitRecord {
  id: string;
  visitDate: string;
  studentProfile: {
    firstName: string;
    lastName: string;
    studentNumber: string;
  };
  chiefComplaintEnc?: string;
  concernTag?: string;
}

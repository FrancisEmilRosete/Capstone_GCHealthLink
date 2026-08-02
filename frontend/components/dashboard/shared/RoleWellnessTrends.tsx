'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useServerEvents } from '@/lib/useServerEvents';
import WellnessTrendsWidget, { WellnessTrendPoint, WellnessConcernShare } from './WellnessTrendsWidget';
import toast from 'react-hot-toast';

interface WellnessTrendsResponse {
  success: boolean;
  message: string;
  data: {
    totalVisits: number;
    monthly: WellnessTrendPoint[];
    weekly: WellnessTrendPoint[];
    concerns: WellnessConcernShare[];
  };
}

const TERM_MAP: Record<string, string> = {
  allergyEnc: 'Allergy',
  asthmaEnc: 'Asthma',
  chickenPoxEnc: 'Chicken Pox',
  diabetesEnc: 'Diabetes',
  dysmenorrheaEnc: 'Dysmenorrhea',
  epilepsySeizureEnc: 'Epilepsy / Seizure',
  heartDisorderEnc: 'Heart Disorder',
  hepatitisEnc: 'Hepatitis',
  hypertensionEnc: 'Hypertension',
  measlesEnc: 'Measles',
  mumpsEnc: 'Mumps',
  anxietyDisorderEnc: 'Anxiety',
  panicAttackHyperventilationEnc: 'Panic Attack',
  pneumoniaEnc: 'Pneumonia',
  ptbPrimaryComplexEnc: 'PTB',
  typhoidFeverEnc: 'Typhoid Fever',
  covid19Enc: 'COVID-19',
  urinaryTractInfectionEnc: 'UTI',
  hasPastOperationEnc: 'Past Operation',
};

function simplifyTag(tag: string): string {
  if (TERM_MAP[tag]) return TERM_MAP[tag];
  return tag
    .replace(/Enc$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export default function RoleWellnessTrends({ className }: { className?: string }) {
  const [data, setData] = useState<WellnessTrendsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadTrends() {
    const token = getToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await api.get<WellnessTrendsResponse>('/analytics/trends', token);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError) {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrends();
  }, []);

  useServerEvents(['visits'], () => {
    void loadTrends();
  });

  if (loading && !data) {
    return (
      <div className={`skeleton rounded-2xl h-[400px] w-full ${className ?? ''}`} />
    );
  }

  const safeData = data || {
    totalVisits: 0,
    monthly: [],
    weekly: [],
    concerns: []
  };

  const simpleConcerns = safeData.concerns.map(c => ({
    ...c,
    tag: simplifyTag(c.tag)
  }));

  const mappedMonthly = (safeData.monthly || []).map((m: any) => ({
    label: m.month || m.label || '',
    visits: typeof m.count === 'number' ? m.count : (m.visits || 0)
  }));

  const mappedWeekly = (safeData.weekly || []).map((w: any) => ({
    label: w.day || w.label || '',
    visits: typeof w.count === 'number' ? w.count : (w.visits || 0)
  }));

  return (
    <WellnessTrendsWidget
      className={className}
      totalVisits={safeData.totalVisits}
      monthly={mappedMonthly}
      weekly={mappedWeekly}
      concerns={simpleConcerns}
    />
  );
}

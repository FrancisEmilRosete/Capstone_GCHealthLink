import { redirect } from 'next/navigation';

export default async function PrescriptionPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  redirect(`/dashboard/doctor/records/${encodeURIComponent(studentId)}`);
}

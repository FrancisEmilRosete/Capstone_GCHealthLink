import { redirect } from 'next/navigation';

interface DashboardPageProps {
  params: Promise<{ role: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { role } = await params;

  if (role === 'staff') redirect('/dashboard/staff');
  if (role === 'doctor') redirect('/dashboard/doctor');
  if (role === 'dental') redirect('/dashboard/dental');
  if (role === 'student') redirect('/dashboard/student');
  if (role === 'admin') redirect('/dashboard/admin');

  redirect('/login');
}

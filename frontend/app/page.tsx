/**
 * LANDING PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /
 *
 * Public entry point that introduces GC HealthLink and
 * guides users to the login experience.
 */

import Link from 'next/link';
import Image from 'next/image';
import { Play, CheckCircle, Shield, Activity, Calendar, Users, HeartPulse, Clock, FileText, ArrowRight, BedSingle, Thermometer } from 'lucide-react';
import AppLogo from '@/components/branding/AppLogo';
import { Button } from '@/components/ui/Button';

export default function RootPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-200 overflow-hidden relative">
      
      {/* ── Soft Background Gradients ─────────────────────────── */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-100/50 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-5%] h-[500px] w-[500px] rounded-full bg-cyan-100/40 blur-[100px] pointer-events-none"></div>

      {/* ── Floating Top Navigation ────────────────────────────── */}
      <div className="px-6 pt-6 sm:px-8 relative z-50 flex justify-center">
        <nav className="w-full max-w-6xl rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-slate-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logos */}
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
              <Image src="/icons/gc-logo.png" alt="Gordon College" width={28} height={28} className="object-contain" priority />
              <Image src="/icons/clinic-logo.png" alt="Health Services Unit" width={28} height={28} className="object-contain" priority />
            </div>

            {/* Brand */}
            <div className="flex items-center gap-2">
              <AppLogo className="h-5 w-5 text-blue-600" />
              <span className="text-base font-bold tracking-tight text-slate-900">GC HealthLink</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#about" className="hover:text-slate-900 transition-colors">About</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] rounded-full px-7 py-2.5 font-bold hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 border border-white/20"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </nav>
      </div>

      {/* ── Hero Section ────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 pt-20 pb-16 lg:pt-32">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Left: Copy */}
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white shadow-sm px-3 py-1.5 text-xs font-semibold text-slate-600 mb-8">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
              Built for campus care teams
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              The calm operating system for your <span className="text-blue-600">clinic.</span>
            </h1>

            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              GC HealthLink brings scheduling, patient records, triage, and care coordination into one pristine workspace — so your team can focus on students, not paperwork.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] hover:bg-right text-white rounded-full h-14 px-10 text-lg font-bold shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:shadow-[0_0_40px_rgba(79,70,229,0.6)] hover:scale-105 hover:-translate-y-1 transition-all duration-500 active:scale-95 flex items-center justify-center gap-3 group border border-white/20"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Highly Secure</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>Gordon College</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>99.9% uptime</span>
            </div>
          </div>

          {/* Right: Abstract Mockup Presentation */}
          <div className="relative w-full h-[500px] lg:h-[600px] rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 shadow-xl overflow-hidden flex items-center justify-center">
            
            {/* The main "UI Board" */}
            <div className="relative w-[85%] h-[75%] rounded-2xl bg-white/60 backdrop-blur-md border border-white shadow-sm p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <AppLogo className="h-5 w-5 text-blue-300" />
                  <div className="w-20 h-3 rounded-full bg-blue-100"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-16 h-4 rounded-full bg-slate-100"></div>
                  <div className="w-6 h-4 rounded-full bg-slate-100"></div>
                </div>
              </div>

              {/* Fake UI elements */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="col-span-1 h-32 rounded-xl bg-white shadow-sm border border-slate-100 p-4">
                  <div className="w-1/2 h-2 rounded-full bg-slate-200 mb-4"></div>
                  <div className="w-full h-16 rounded-md bg-blue-50"></div>
                </div>
                <div className="col-span-2 h-32 rounded-xl bg-white shadow-sm border border-slate-100 p-4">
                  <div className="w-1/3 h-2 rounded-full bg-slate-200 mb-4"></div>
                  <div className="flex items-end gap-2 h-16">
                    {[40, 70, 45, 90, 65, 80].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-sm bg-blue-400" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 rounded-xl bg-white shadow-sm border border-slate-100 p-4">
                  <div className="w-1/2 h-2 rounded-full bg-slate-200 mb-3"></div>
                  <div className="w-3/4 h-2 rounded-full bg-slate-100"></div>
                </div>
                <div className="h-24 rounded-xl bg-white shadow-sm border border-slate-100 p-4">
                  <div className="w-1/2 h-2 rounded-full bg-slate-200 mb-3"></div>
                  <div className="w-3/4 h-2 rounded-full bg-slate-100"></div>
                </div>
              </div>
            </div>

            {/* Floating Top-Left Card */}
            <div className="absolute top-10 left-[-20px] sm:left-4 rounded-2xl bg-white shadow-xl border border-slate-100 p-5 w-64 animate-float">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <Calendar size={12} className="text-blue-500" /> Next Class Excuse
              </p>
              <p className="text-sm font-bold text-slate-900">Medical Consultation</p>
              <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <Thermometer size={12} className="text-red-400" /> Diagnosis: "Midterm Fever"
              </p>
            </div>

            {/* Floating Bottom-Right Card */}
            <div className="absolute bottom-10 right-[-20px] sm:right-4 rounded-2xl bg-white shadow-xl border border-slate-100 p-5 w-56 animate-float" style={{ animationDelay: '1.5s' }}>
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <Users size={12} className="text-blue-500" /> Today's Patients
              </p>
              <p className="text-xl font-bold text-slate-900">101 Students</p>
              <p className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-1">
                <BedSingle size={12} /> Mostly needing a nap
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────── */}
      <section id="features" className="relative z-10 bg-white border-y border-slate-100 py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need to run the clinic</h2>
            <p className="mt-4 text-lg text-slate-600">
              Powerful tools designed specifically for the unique workflows of a campus health environment.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: CheckCircle, title: 'Smart Queueing',    desc: 'Automated triage and priority routing for walk-in patients.' },
              { icon: Shield,      title: 'Unified Records',   desc: 'A single, highly secure health profile across all campus clinics.' },
              { icon: Activity,    title: 'Real-time Analytics', desc: 'Instant insights into clinic traffic, inventory, and operations.' },
              { icon: Calendar,    title: 'Scheduling',        desc: 'Seamless appointment booking for medical and dental consultations.' },
              { icon: Users,       title: 'Student Profiles',  desc: 'Comprehensive histories directly tied to student ID numbers.' },
              { icon: HeartPulse,  title: 'Inventory Sync',    desc: 'Track medical supplies and medications across all departments.' },
            ].map(({ icon: Icon, title, desc }, idx) => (
              <div key={idx} className="rounded-2xl bg-[#f8fafc] border border-slate-100 p-8 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-6">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Section ───────────────────────────────────────── */}
      <section id="about" className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8">
          <div className="rounded-3xl bg-slate-900 text-white overflow-hidden shadow-2xl">
            <div className="grid lg:grid-cols-2">
              <div className="p-12 lg:p-16 flex flex-col justify-center">
                <h2 className="text-3xl font-bold mb-6">About GC HealthLink</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  GC HealthLink was developed to bridge the gap between traditional medical records and the fast-paced needs of Gordon College. We empower our campus medical, dental, and nursing staff with modern technology to provide better, faster, and more coordinated care to every student.
                </p>
                <div className="flex items-center gap-4 text-sm font-semibold text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 24/7 Access
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> HIPAA Ready
                  </div>
                </div>
              </div>
              <div className="bg-blue-600 p-12 lg:p-16 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-500 rounded-full blur-[80px]"></div>
                <h3 className="text-2xl font-bold mb-4 relative z-10">Our Mission</h3>
                <p className="text-blue-100 text-lg leading-relaxed relative z-10">
                  To ensure that every student at Gordon College has immediate, reliable access to healthcare resources through a unified, secure, and user-friendly platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AppLogo className="h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-500">
              GC HealthLink &copy; {new Date().getFullYear()}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Gordon College Campus Clinic Management System
          </p>
        </div>
      </footer>

    </main>
  );
}


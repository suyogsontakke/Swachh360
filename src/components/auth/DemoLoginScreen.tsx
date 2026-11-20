import React, { useState } from 'react';
import { ArrowRight, Building2, HardHat, Info, ShieldCheck, Users } from 'lucide-react';
import { DEMO_USERS } from '../../data/seedData';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { SwachhLogo } from '../common/SwachhLogo';

const ROLE_CARDS: Array<{
  role: UserRole;
  title: string;
  subtitle: string;
  email: string;
  person: string;
  capabilities: string[];
  Icon: React.FC<{ className?: string }>;
}> = [
  {
    role: 'citizen',
    title: 'Citizen Portal',
    subtitle: 'Report issues & track transparent resolution',
    email: DEMO_USERS.citizen.email,
    person: `${DEMO_USERS.citizen.name} · ${DEMO_USERS.citizen.wardLabel}`,
    capabilities: [
      'Submit photo-verified sanitation complaints',
      'Track 5-stage resolution timeline live',
      'Inspect before & after cleaning evidence',
    ],
    Icon: Users,
  },
  {
    role: 'supervisor',
    title: 'Municipal Supervisor',
    subtitle: 'Dispatch crews, monitor wards & verify work',
    email: DEMO_USERS.supervisor.email,
    person: `${DEMO_USERS.supervisor.name} · Zone 4 & 5`,
    capabilities: [
      'Filter, prioritize & assign complaints to workers',
      'Verify worker after-cleaning evidence before closing',
      'Review Recharts ward analytics & hotspots',
    ],
    Icon: Building2,
  },
  {
    role: 'worker',
    title: 'Sanitation Worker',
    subtitle: 'Mobile-ready field queue & photo proof upload',
    email: DEMO_USERS.worker.email,
    person: `${DEMO_USERS.worker.name} · Crew ${DEMO_USERS.worker.crewCode}`,
    capabilities: [
      'Accept assigned tasks & mark In Progress',
      'Upload after-cleaning evidence photographs',
      'Submit completed jobs for supervisor sign-off',
    ],
    Icon: HardHat,
  },
];

export const DemoLoginScreen: React.FC = () => {
  const { loginAsRole, loginWithEmail, complaints } = useApp();
  const [selectedRole, setSelectedRole] = useState<UserRole>('citizen');
  const [emailInput, setEmailInput] = useState(DEMO_USERS.citizen.email);
  const [errorMsg, setErrorMsg] = useState('');

  const openCount = complaints.filter((c) => c.status !== 'Resolved').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setEmailInput(DEMO_USERS[role].email);
    setErrorMsg('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginWithEmail(emailInput);
    if (!ok) {
      setErrorMsg(
        'Please use one of the three demonstration accounts: citizen@swachh360.demo, supervisor@swachh360.demo, or worker@swachh360.demo.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col lg:flex-row">
      {/* Left Institutional Civic Column */}
      <aside className="lg:w-[44%] xl:w-[42%] bg-[#142B45] text-white px-6 py-10 sm:px-10 lg:px-12 lg:py-14 flex flex-col justify-between">
        <div>
          <SwachhLogo variant="light" showTagline size="lg" />

          <div className="mt-10 max-w-lg">
            <p className="text-xs font-medium text-[#27AE75] tracking-wide">
              Urban Slum Sanitation &amp; Waste Management Tracker
            </p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
              Transparent sanitation operations from citizen report to verified cleanup.
            </h1>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              SWACHH360 connects residents of densely populated urban communities with municipal
              supervisors and field sanitation crews on a single synchronized complaint ledger.
            </p>
          </div>

          {/* Connected Workflow Summary */}
          <div className="mt-10 pt-8 border-t border-white/15">
            <h2 className="text-xs font-semibold text-slate-200 mb-4">
              End-to-End Accountability Loop
            </h2>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="font-mono text-xs text-[#27AE75] font-semibold mt-0.5 tabular-nums">
                  01
                </span>
                <span>Citizen logs complaint with ward, landmark, and site photograph.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-xs text-[#27AE75] font-semibold mt-0.5 tabular-nums">
                  02
                </span>
                <span>Municipal supervisor prioritizes issue and dispatches a field worker.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-xs text-[#27AE75] font-semibold mt-0.5 tabular-nums">
                  03
                </span>
                <span>Sanitation worker clears site and uploads after-cleaning photo evidence.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-xs text-[#27AE75] font-semibold mt-0.5 tabular-nums">
                  04
                </span>
                <span>Supervisor verifies photo evidence and marks Resolved for citizen review.</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Live Local Prototype Snapshot */}
        <div className="mt-10 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-6">
            <div>
              <p className="font-mono text-lg font-semibold text-white tabular-nums">
                {complaints.length}
              </p>
              <p className="text-slate-400">Tracked Records</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-amber-300 tabular-nums">
                {openCount}
              </p>
              <p className="text-slate-400">Active Queue</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-[#27AE75] tabular-nums">
                {resolvedCount}
              </p>
              <p className="text-slate-400">Verified Resolved</p>
            </div>
          </div>
          <div className="text-slate-400">
            Nagpur Demonstration Dataset · Firebase-Ready Storage
          </div>
        </div>
      </aside>

      {/* Right Interactive Demo Access Column */}
      <main className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="w-full max-w-2xl mx-auto">
          {/* Clear Demo Environment Notice */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white border border-[#E2E8F0] mb-6">
            <Info className="w-4 h-4 text-[#1D4262] shrink-0 mt-0.5" />
            <div className="text-xs text-[#52677A] leading-relaxed">
              <strong className="text-[#142B45]">Demonstration Prototype Environment:</strong> Uses
              local browser storage to synchronize complaints seamlessly across all three roles
              without requiring live Firebase credentials. Switch roles at any time to verify the
              complete workflow.
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#142B45] tracking-tight">
              Select a Demo Portal
            </h2>
            <p className="text-sm text-[#52677A] mt-1">
              Choose a role below to launch directly into its live workspace, or sign in with one of
              the demonstration emails.
            </p>
          </div>

          {/* Role Selector Cards */}
          <div className="grid grid-cols-1 gap-3.5">
            {ROLE_CARDS.map((card) => {
              const isSelected = selectedRole === card.role;
              const Icon = card.Icon;
              return (
                <div
                  key={card.role}
                  onClick={() => handleSelectRole(card.role)}
                  className={`cursor-pointer bg-white rounded-lg border p-4 sm:p-5 transition-colors ${
                    isSelected
                      ? 'border-[#142B45] ring-1 ring-[#142B45]'
                      : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#142B45] text-white'
                            : 'bg-[#F4F7FA] text-[#1D4262]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                          <h3 className="text-base font-bold text-[#142B45]">{card.title}</h3>
                          <span className="text-xs font-mono text-[#52677A]">{card.email}</span>
                        </div>
                        <p className="text-xs text-[#52677A] mt-0.5">{card.person}</p>
                        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#172B3A]">
                          {card.capabilities.map((cap) => (
                            <li key={cap} className="inline-flex items-center gap-1.5">
                              <span className="text-[#27AE75] font-bold">·</span>
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loginAsRole(card.role);
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-[#27AE75] hover:bg-[#1E8E5E] text-white'
                          : 'bg-[#142B45] hover:bg-[#1D4262] text-white'
                      }`}
                    >
                      Enter Portal
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direct Demo Email Sign-In Form */}
          <form
            onSubmit={handleFormSubmit}
            className="mt-6 bg-white border border-[#E2E8F0] rounded-lg p-5"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <label htmlFor="demo-email" className="text-xs font-semibold text-[#142B45]">
                Demo Account Email Sign-In
              </label>
              <span className="inline-flex items-center gap-1 text-xs text-[#52677A]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#27AE75]" />
                No password required in demo mode
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="demo-email"
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="citizen@swachh360.demo"
                className="flex-1 px-3.5 py-2.5 text-sm font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-[#172B3A] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#142B45]"
                required
              />
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#142B45] hover:bg-[#1D4262] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Sign In to Demo
              </button>
            </div>
            {errorMsg && (
              <p className="mt-2 text-xs text-red-700 font-medium" role="alert">
                {errorMsg}
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};

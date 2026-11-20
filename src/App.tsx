import React from 'react';
import { DemoLoginScreen } from './components/auth/DemoLoginScreen';
import { CitizenPortal } from './components/citizen/CitizenPortal';
import { SwachhLogo } from './components/common/SwachhLogo';
import { SupervisorPortal } from './components/supervisor/SupervisorPortal';
import { WorkerPortal } from './components/worker/WorkerPortal';
import { AppProvider, useApp } from './context/AppContext';

const SwachhRouter: React.FC = () => {
  const { currentUser, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex flex-col items-center justify-center p-6">
        <SwachhLogo variant="dark" showTagline size="md" />
        <div className="mt-6 w-56 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-[#27AE75] rounded-full" />
        </div>
        <p className="mt-3 text-xs text-[#52677A]">
          Loading SWACHH360 municipal workspace...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <DemoLoginScreen />;
  }

  if (currentUser.role === 'citizen') {
    return <CitizenPortal />;
  }

  if (currentUser.role === 'supervisor') {
    return <SupervisorPortal />;
  }

  return <WorkerPortal />;
};

export default function App() {
  return (
    <AppProvider>
      <SwachhRouter />
    </AppProvider>
  );
}

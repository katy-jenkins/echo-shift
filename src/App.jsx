import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Schedule from '@/pages/Schedule';
import Workers from '@/pages/Workers';
import AbsenceSummary from '@/pages/AbsenceSummary';
import SupportScheduler from '@/pages/SupportScheduler';
import Students from '@/pages/Students';
import TermCalendar from '@/pages/TermCalendar';
import PublicAbsences from '@/pages/PublicAbsences';
import PublicSchedule from '@/pages/PublicSchedule';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Always allow public routes without auth
  const isPublicRoute = ['/public-absences', '/public-schedule', '/sched'].some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/public-absences" element={<PublicAbsences />} />
        <Route path="/public-schedule" element={<PublicSchedule />} />
        <Route path="/sched" element={<PublicSchedule />} />
      </Routes>
    );
  }

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Schedule />} />
        <Route path="/summary" element={<AbsenceSummary />} />
        <Route path="/support-scheduler" element={<SupportScheduler />} />
        <Route path="/term-calendar" element={<TermCalendar />} />
        <Route path="/students" element={<Students />} />
        <Route path="/workers" element={<Workers />} />
      </Route>
      <Route path="/public-absences" element={<PublicAbsences />} />
      <Route path="/public-schedule" element={<PublicSchedule />} />
      <Route path="/sched" element={<PublicSchedule />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
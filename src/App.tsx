import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CheckEmail from "./pages/CheckEmail";
import Portal from "./pages/Portal";
import PortalOnboarding from "./pages/PortalOnboarding";
import PortalOnboardingComplete from "./pages/PortalOnboardingComplete";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import AccountDeleted from "./pages/AccountDeleted";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Full app with all routes (for test subdomain)
const TestSubdomainApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<PasswordGate><Auth /></PasswordGate>} />
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/portal/onboarding" element={<PortalOnboarding />} />
      <Route path="/portal/onboarding-complete" element={<PortalOnboardingComplete />} />
      <Route path="/portal" element={<Portal />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/account-deleted" element={<AccountDeleted />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

// Limited routes for main domain (marketing only)
const MainDomainApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/contact" element={<Contact />} />
      
      {/* All other routes redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

const AppContent = () => {
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <TestSubdomainApp />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
};

const App = () => <AppContent />;

export default App;

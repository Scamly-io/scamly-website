import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PasswordGate } from "@/components/PasswordGate";
import { isTestSubdomain } from "@/lib/subdomain";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CheckEmail from "./pages/CheckEmail";
import Portal from "./pages/Portal";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Full app with all routes (for test subdomain)
const TestSubdomainApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/portal" element={<Portal />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
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
      
      {/* All other routes redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

const AppContent = () => {
  const isTest = isTestSubdomain();
  
  return (
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {isTest ? (
              <PasswordGate>
                <TestSubdomainApp />
              </PasswordGate>
            ) : (
              <MainDomainApp />
            )}
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
};

const App = () => <AppContent />;

export default App;

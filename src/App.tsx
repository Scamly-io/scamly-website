import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { PageLayout } from "@/components/PageLayout";

import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CheckEmail from "./pages/CheckEmail";
import Portal from "./pages/Portal";
import PortalOnboarding from "./pages/PortalOnboarding";
import PortalOnboardingComplete from "./pages/PortalOnboardingComplete";
import PortalFeedback from "./pages/PortalFeedback";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import AccountDeleted from "./pages/AccountDeleted";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Full app with all routes (for test subdomain)
const TestSubdomainApp = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<PageLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/portal/onboarding" element={<PortalOnboarding />} />
        <Route path="/portal/onboarding-complete" element={<PortalOnboardingComplete />} />
        <Route path="/portal/feedback" element={<PortalFeedback />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/account-deleted" element={<AccountDeleted />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

// Limited routes for main domain (marketing only)
const MainDomainApp = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<PageLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
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

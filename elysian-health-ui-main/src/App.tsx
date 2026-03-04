import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import { LanguageProvider } from "@/lib/i18n";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SearchMedicines from "./pages/SearchMedicines";
import MedicineDetail from "./pages/MedicineDetail";
import Reminders from "./pages/Reminders";
import HistoryLog from "./pages/HistoryLog";
import Profile from "./pages/Profile";
import ScanPrescription from "./pages/ScanPrescription";
import MultiMedOnboarding from "./pages/MultiMedOnboarding";
import AiChat from "./pages/AiChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/search" element={<SearchMedicines />} />
              <Route path="/medicine/:id" element={<MedicineDetail />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/history" element={<HistoryLog />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/scan" element={<ScanPrescription />} />
              <Route path="/multi-onboarding" element={<MultiMedOnboarding />} />
              <Route path="/chat" element={<AiChat />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

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
import ProtectedRoute from "@/components/ProtectedRoute";

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
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><SearchMedicines /></ProtectedRoute>} />
              <Route path="/medicine/:id" element={<ProtectedRoute><MedicineDetail /></ProtectedRoute>} />
              <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><HistoryLog /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><ScanPrescription /></ProtectedRoute>} />
              <Route path="/multi-onboarding" element={<ProtectedRoute><MultiMedOnboarding /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><AiChat /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

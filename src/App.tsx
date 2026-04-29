import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { SubscriptionGate } from "./components/SubscriptionGate";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminServices from "./pages/admin/AdminServices";
import AdminEmployees from "./pages/admin/AdminEmployees";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminClients from "./pages/admin/AdminClients";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminReports from "./pages/admin/AdminReports";
import { AdminLayout } from "./components/admin/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionGate>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="kalendarz" element={<AdminCalendar />} />
              <Route path="wizyty" element={<AdminAppointments />} />
              <Route path="klienci" element={<AdminClients />} />
              <Route path="wiadomosci" element={<AdminMessages />} />
              <Route path="ustawienia" element={<AdminSettings />} />
              <Route path="galeria" element={<AdminGallery />} />
              <Route path="raporty" element={<AdminReports />} />
              <Route path="uslugi" element={<AdminServices />} />
              <Route path="pracownicy" element={<AdminEmployees />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </SubscriptionGate>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

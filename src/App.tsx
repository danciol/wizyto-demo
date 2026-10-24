import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/AuthContext";
import { SubscriptionGate } from "./components/SubscriptionGate";
import { DemoBanner } from "./components/DemoBanner";
import { IS_DEMO } from "./config/demo";
import { useEffect } from "react";
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
import AdminWaitingList from "./pages/admin/AdminWaitingList";
import AdminDaysOff from "./pages/admin/AdminDaysOff";
import AdminTimeBlocks from "./pages/admin/AdminTimeBlocks";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import BookingWidget from "./pages/BookingWidget";
import { AdminLayout } from "./components/admin/AdminLayout";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    if (IS_DEMO) {
      import("./lib/seedDemo").then(m => m.seedDemo().catch(console.error));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionGate>
          <TooltipProvider>
            {IS_DEMO && <DemoBanner />}
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/widget" element={<BookingWidget />} />
                <Route path="/polityka-prywatnosci" element={<PrivacyPolicy />} />
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
                  <Route path="oczekujacy" element={<AdminWaitingList />} />
                  <Route path="dni-wolne" element={<AdminDaysOff />} />
                  <Route path="blokady" element={<AdminTimeBlocks />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SubscriptionGate>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

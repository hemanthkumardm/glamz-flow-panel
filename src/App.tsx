import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Billing from "@/pages/Billing";
import Plans from "@/pages/Plans";
import Team from "@/pages/Team";
import Settings from "@/pages/Settings";
import Offers from "@/pages/Offers";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/" element={<RequireAuth adminOnly><Dashboard /></RequireAuth>} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/plans" element={<RequireAuth adminOnly><Plans /></RequireAuth>} />
              <Route path="/team" element={<RequireAuth adminOnly><Team /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth adminOnly><Settings /></RequireAuth>} />
              <Route path="/offers" element={<RequireAuth adminOnly><Offers /></RequireAuth>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

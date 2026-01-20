import React, { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { IBCCProvider } from "@/contexts/IBCCContext";
import { createOptimizedQueryClient } from "@/lib/cache/queryClientConfig";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Use lazy initialization to prevent HMR issues with QueryClient
const App: React.FC = () => {
  // Create QueryClient lazily using useState to survive HMR
  const [queryClient] = useState<QueryClient>(() => createOptimizedQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <IBCCProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </IBCCProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

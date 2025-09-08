
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

// import HotelSearch from "./pages/HotelSearch"; // removed the search route
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Trips from "./pages/Trips";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen w-full">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route 
              path="/home" 
              element={
                <>
                  <Header />
                  <Home />
                </>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <>
                  <Header />
                  <Profile />
                </>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <>
                  <Header />
                  <Chat />
                </>
              } 
            />
            <Route 
              path="/trips" 
              element={
                <>
                  <Header />
                  <Trips />
                </>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

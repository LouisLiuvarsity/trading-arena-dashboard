import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import UsersPage from "./pages/UsersPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import ChatPage from "./pages/ChatPage";
import StatsPage from "./pages/StatsPage";
import AdminLogsPage from "./pages/AdminLogsPage";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/users" component={UsersPage} />
        <Route path="/competitions" component={CompetitionsPage} />
        <Route path="/chat" component={ChatPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/logs" component={AdminLogsPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#1C2030",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#D1D4DC",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

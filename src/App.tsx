import { useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import LoginPage from "./pages/LoginPage";
import ResidentsPage from "./pages/ResidentsPage";
import type { AppPage } from "./types/page";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box>
      <Typography variant="h4" fontWeight={800}>
        {title}
      </Typography>
      <Typography color="text.secondary">
        This section will be built next.
      </Typography>
    </Box>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<AppPage>("residents");

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const pageContent = {
    dashboard: <PlaceholderPage title="Dashboard" />,
    residents: <ResidentsPage />,
    schedule: <PlaceholderPage title="Schedule Builder" />,
    "call-swaps": <PlaceholderPage title="Call Swaps" />,
    vacation: <PlaceholderPage title="Vacation Requests" />,
    settings: <PlaceholderPage title="Settings" />,
  }[currentPage];

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {pageContent}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
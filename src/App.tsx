import { useState } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

import { AuthProvider, useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";

import LoginPage from "./pages/LoginPage";
import WhosOnPage from "./pages/WhosOnPage";
import ResidentsPage from "./pages/ResidentsPage";
import AttendingsPage from "./pages/AttendingsPage";
import AttendingCallSchedulePage from "./pages/AttendingCallSchedulePage";
import ServicesPage from "./pages/ServicesPage";
import MonthlyScheduleMatrixPage from "./pages/MonthlyScheduleMatrixPage";
import BlockSchedulePage from "./pages/BlockSchedulePage";

import type { AppPage } from "./types/page";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box>
      <Typography variant="h4" fontWeight={800}>
        {title}
      </Typography>

      <Typography color="text.secondary" sx={{ mt: 1 }}>
        This section is currently under development.
      </Typography>
    </Box>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<AppPage>("whos-on");

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
    "whos-on": <WhosOnPage />,
    residents: <ResidentsPage />,
    attendings: <AttendingsPage />,
    "attending-call-schedule": <AttendingCallSchedulePage />,
    services: <ServicesPage />,
    schedule: <MonthlyScheduleMatrixPage />,
    "block-schedule": <BlockSchedulePage />,
    "call-swaps": <PlaceholderPage title="Call Swaps" />,
    vacation: <PlaceholderPage title="Vacation" />,
    settings: <PlaceholderPage title="Settings" />,
  }[currentPage];

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {pageContent}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
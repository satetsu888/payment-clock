import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { AccountProvider, useAccountContext } from "./contexts/AccountContext";
import { AccountSelectScreen } from "./components/pages/AccountSelectScreen";
import { DashboardScreen } from "./components/pages/DashboardScreen";
import { TestClockDetail } from "./components/pages/TestClockDetail";
import { UpdateDialog } from "./components/ui/UpdateDialog";
import { advanceTestClock, deleteTestClock } from "./lib/api";
import type { TestClock } from "./lib/types";

function AppContent() {
  const { selectedAccount } = useAccountContext();
  const [selectedTestClock, setSelectedTestClock] = useState<TestClock | null>(
    null,
  );

  if (!selectedAccount) {
    return <AccountSelectScreen />;
  }

  if (selectedTestClock) {
    return (
      <TestClockDetail
        initialClock={selectedTestClock}
        onBack={() => setSelectedTestClock(null)}
        onAdvance={async (testClockId, frozenTime) => {
          await advanceTestClock(selectedAccount.id, testClockId, frozenTime);
        }}
        onDelete={async (testClockId) => {
          await deleteTestClock(selectedAccount.id, testClockId);
        }}
      />
    );
  }

  return <DashboardScreen onSelectTestClock={setSelectedTestClock} />;
}

function App() {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  useEffect(() => {
    const unlisten = listen("menu-check-update", () => {
      setUpdateDialogOpen(true);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <AccountProvider>
      <AppContent />
      <UpdateDialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
      />
    </AccountProvider>
  );
}

export default App;

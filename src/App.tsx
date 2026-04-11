import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { AccountProvider, useAccountContext } from "./contexts/AccountContext";
import { AccountSelectScreen } from "./components/AccountSelectScreen";
import { DashboardScreen } from "./components/DashboardScreen";
import { TestClockDetail } from "./components/TestClockDetail";
import { UpdateDialog } from "./components/UpdateDialog";
import { advanceTestClock, deleteTestClock } from "./lib/api";

function AppContent() {
  const { selectedAccount } = useAccountContext();
  const [selectedTestClockId, setSelectedTestClockId] = useState<string | null>(
    null,
  );

  if (!selectedAccount) {
    return <AccountSelectScreen />;
  }

  if (selectedTestClockId) {
    return (
      <TestClockDetail
        testClockId={selectedTestClockId}
        onBack={() => setSelectedTestClockId(null)}
        onAdvance={async (testClockId, frozenTime) => {
          await advanceTestClock(selectedAccount.id, testClockId, frozenTime);
        }}
        onDelete={async (testClockId) => {
          await deleteTestClock(selectedAccount.id, testClockId);
        }}
      />
    );
  }

  return <DashboardScreen onSelectTestClock={setSelectedTestClockId} />;
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

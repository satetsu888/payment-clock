import { useState } from "react";
import { AccountProvider, useAccountContext } from "./contexts/AccountContext";
import { AccountSelectScreen } from "./components/AccountSelectScreen";
import { DashboardScreen } from "./components/DashboardScreen";
import { TestClockDetail } from "./components/TestClockDetail";
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
  return (
    <AccountProvider>
      <AppContent />
    </AccountProvider>
  );
}

export default App;

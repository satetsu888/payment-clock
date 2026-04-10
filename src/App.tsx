import { AccountProvider, useAccountContext } from "./contexts/AccountContext";
import { AccountSelectScreen } from "./components/AccountSelectScreen";
import { DashboardShell } from "./components/DashboardShell";

function AppContent() {
  const { selectedAccount } = useAccountContext();

  if (!selectedAccount) {
    return <AccountSelectScreen />;
  }

  return <DashboardShell />;
}

function App() {
  return (
    <AccountProvider>
      <AppContent />
    </AccountProvider>
  );
}

export default App;

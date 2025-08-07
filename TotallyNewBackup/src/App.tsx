// src/App.tsx
import Landing from "./landing";
import Dashboard from "./dashboard";
import AdminPage from "./src/pages/Admin";
import Login from "./login";

const App = () => {
  const path = window.location.pathname;

  if (path === "/dashboard") {
    return <Dashboard />;
  }

  if (path === "/login") {
    return <Login />;
  }

  if (path === "/admin") {
    return <AdminPage />;
  }

  return <Landing />;
};

export default App;
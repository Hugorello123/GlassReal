import NewsTicker from "./NewsTicker";
import Landing from "./landing";
import Dashboard from "./dashboard";  // <-- changed
import Login from "./login";
import BusinessTicker from "./components/BusinessTicker";

export default function App() {
  const path = window.location.pathname.toLowerCase();

  // render by URL path
  if (path.startsWith("/dashboard")) {
    return (
      <>
        <NewsTicker />
         <BusinessTicker /> 
        <Dashboard />
      </>
    );
  }

  if (path.startsWith("/login")) {
    return (
      <>
        <NewsTicker />
        <Login />
      </>
    );
  }

  // default: landing
  return (
    <>
      <NewsTicker />
      <Landing />
    </>
  );
}

import { Box } from "@chakra-ui/react";
import { Provider } from "@/components/ui/provider";
import "./App.css";
import Header from "./layout/Header";
import Footer from "./layout/Footer";
import Chat from "./components/Chat";
import EventMedia from "./components/EventMedia";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AppContextProvider, useAppContext } from "./context/appContext";

function LocketApp() {
  const { username, setUsername, routeHash } = useAppContext();

  if (routeHash) {
    if (routeHash.endsWith("&type=recovery")) {
      window.location.replace(`/login/${routeHash}`);
    }
    if (routeHash.startsWith("#error_code=404"))
      return (
        <div>
          <p>Link đã hết hạn</p>
          <a href="/" style={{ cursor: "pointer" }} variant="link">
            Quay lại Locket
          </a>
        </div>
      );
  }

  return (
    <Box bg="gray.100">
      <Router>
        <Routes>
          {/* Locket Widget — default landing */}
          <Route path="/" element={<EventMedia />} />
          <Route path="/event" element={<EventMedia />} />
          <Route path="/event/:eventId" element={<EventMedia />} />

          {/* Legacy chat (giữ lại) */}
          <Route
            path="/chat"
            element={
              <>
                <Header />
                <Chat />
                <Footer />
              </>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </Box>
  );
}

function App() {
  return (
    <Provider>
      <AppContextProvider>
        <LocketApp />
      </AppContextProvider>
    </Provider>
  );
}

export default App;

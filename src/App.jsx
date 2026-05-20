import { Box } from "@chakra-ui/react";
import { Provider } from "@/components/ui/provider";
import "./App.css";
import Header from "./layout/Header";
import Footer from "./layout/Footer";
import Chat from "./components/Chat";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppContextProvider, useAppContext } from "./context/appContext";
import EventJoin from "./pages/event/EventJoin";
import EventGallery from "./pages/event/EventGallery";
import EventUpload from "./pages/event/EventUpload";
import EventSlideshow from "./pages/event/EventSlideshow";

function ChatApp() {
  const { username, setUsername, routeHash } = useAppContext();

  if (routeHash) {
    if (routeHash.endsWith("&type=recovery")) {
      window.location.replace(`/login/${routeHash}`);
    }
    if (routeHash.startsWith("#error_code=404"))
      return (
        <div>
          <p>This link has expired</p>
          <a href="/" style={{ cursor: "pointer" }} variant="link">
            Back to app
          </a>
        </div>
      );
  }

  return (
    <Box bg="gray.100">
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Header />
                <Chat />
                <Footer />
              </>
            }
          />
          <Route path="/event/:eventId" element={<EventJoin />} />
          <Route path="/event/:eventId/gallery" element={<EventGallery />} />
          <Route path="/event/:eventId/upload" element={<EventUpload />} />
          <Route path="/event/:eventId/slideshow" element={<EventSlideshow />} />
          <Route path="*" element={<p>Not found</p>} />
        </Routes>
      </Router>
    </Box>
  );
}

function App() {
  return (
    <Provider>
      <AppContextProvider>
        <ChatApp />
      </AppContextProvider>
    </Provider>
  );
}

export default App;

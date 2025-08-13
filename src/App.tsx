import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Main from "./components/Main";
import Stream from "./components/Stream";
import BarcodeScanner from "./components/BarcodeScanner";

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/br" element={<BarcodeScanner />} />
          <Route path="/stream" element={<Stream />} />
        </Routes>
      </Router>
  );
}

export default App;

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Main from "./components/Main";
import Stream from "./components/Stream";

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/stream" element={<Stream />} />
        </Routes>
      </Router>
  );
}

export default App;

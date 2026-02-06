import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";

import Home from "./pages/Home";
import Results from "./pages/Results";
import ResourceDetail from "./pages/ResourceDetail";
import Saved from "./pages/Saved";
import SuggestUpdate from "./pages/SuggestUpdate";
import ScrollToTop from "./components/ScrollToTop";

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/resource/:id" element={<ResourceDetail />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/suggest" element={<SuggestUpdate />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

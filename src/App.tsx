import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";

import Home from "./pages/Home";
import Results from "./pages/Results";
import ResourceDetail from "./pages/ResourceDetail";
import Saved from "./pages/Saved";
import SuggestUpdate from "./pages/SuggestUpdate";
import SignUp from "./pages/SignUp";
import Directions from "./pages/Directions";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/resource/:id" element={<ResourceDetail />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/suggest" element={<SuggestUpdate />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/directions/:shelterName" element={<Directions />} />
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

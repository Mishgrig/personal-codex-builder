import { Route, Routes } from "react-router-dom";
import { CodexPage } from "../layout/CodexPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<CodexPage />} />
      <Route path="/cards/:cardId" element={<CodexPage />} />
    </Routes>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProjectsPage } from "@/pages/Projects";
import { ScriptPage } from "@/pages/Script";
import { AssetsPage } from "@/pages/Assets";
import { GeneratePage } from "@/pages/Generate";
import { ComposePage } from "@/pages/Compose";
import { SettingsPage } from "@/pages/Settings";
import { EpisodeListPage } from "@/pages/EpisodeList";
import { SingleEpisodePage } from "@/pages/SingleEpisode";
import { EpisodesPage, EpisodePage } from "@/pages/Storyboard";
import { ToastProvider } from "@/components/ui/Toast";

export default function App() {
  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/episodes" element={<EpisodeListPage />} />
          <Route path="/episode" element={<SingleEpisodePage />} />
          <Route path="/script" element={<ScriptPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/storyboard" element={<EpisodesPage />} />
          <Route path="/storyboard/episode/:episodeId" element={<EpisodePage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}

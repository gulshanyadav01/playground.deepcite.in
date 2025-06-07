import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import SelectModel from './pages/SelectModel';
import UploadData from './pages/UploadData';
import ConfigureTuning from './pages/ConfigureTuning';
import TuningProgress from './pages/TuningProgress';
import ModelQuery from './pages/ModelQuery';
import TestData from './pages/evaluate/TestData';
import Metrics from './pages/evaluate/Metrics';
import Compare from './pages/evaluate/Compare';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="select-model" element={<SelectModel />} />
        <Route path="upload-data" element={<UploadData />} />
        <Route path="configure" element={<ConfigureTuning />} />
        <Route path="progress" element={<TuningProgress />} />
        <Route path="query" element={<ModelQuery />} />
        <Route path="evaluate">
          <Route path="test-data" element={<TestData />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="compare" element={<Compare />} />
        </Route>
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
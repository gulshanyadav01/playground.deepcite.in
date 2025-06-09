import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Configure from './pages/configure';
import TuningProgress from './pages/TuningProgress';
import ModelQuery from './pages/ModelQuery';
import TestData from './pages/evaluate/TestData';
import Metrics from './pages/evaluate/Metrics';
import Compare from './pages/evaluate/Compare';
import MonitoringDashboard from './pages/monitoring/Dashboard';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="configure/*" element={<Configure />} />
        <Route path="progress" element={<TuningProgress />} />
        <Route path="query" element={<ModelQuery />} />
        <Route path="evaluate">
          <Route path="test-data" element={<TestData />} />
          <Route path="metrics" element={<Metrics />} />
          <Route path="compare" element={<Compare />} />
        </Route>
        <Route path="monitoring" element={<MonitoringDashboard />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;

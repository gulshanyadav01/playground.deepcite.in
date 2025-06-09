import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigureProvider, useConfigureContext } from './ConfigureContext';
import SelectModel from './SelectModel';
import UploadData from './UploadData';
import ConfigureParameters from './ConfigureParameters';

function ConfigureContent() {
  const { goToStep } = useConfigureContext();
  const location = useLocation();

  // Update current step based on route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/configure/model')) {
      goToStep(1);
    } else if (path.includes('/configure/data')) {
      goToStep(2);
    } else if (path.includes('/configure/parameters')) {
      goToStep(3);
    }
  }, [location.pathname, goToStep]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Content */}
        <Routes>
          <Route path="/" element={<Navigate to="/configure/model" replace />} />
          <Route path="/model" element={<SelectModel />} />
          <Route path="/data" element={<UploadData />} />
          <Route path="/parameters" element={<ConfigureParameters />} />
        </Routes>
      </div>
    </div>
  );
}

export default function Configure() {
  return (
    <ConfigureProvider>
      <ConfigureContent />
    </ConfigureProvider>
  );
}

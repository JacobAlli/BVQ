import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChannelDashboard from './components/ChannelDashboard';
import OBSOverlay from './components/OBSOverlay';

export default function App() {
  return (
    <Routes>
      <Route path="/channel/:channelName" element={<ChannelDashboard />} />
      <Route path="/overlay/:channelName" element={<OBSOverlay />} />
      <Route path="*" element={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-bvq-accent mb-2">BVQ</h1>
            <p className="text-bvq-text-dim">Navigate to /channel/yourname to view a dashboard</p>
          </div>
        </div>
      } />
    </Routes>
  );
}

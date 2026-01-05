// src/pages/Home.tsx
import { useState } from 'react';
import { Container, Typography } from '@mui/material';
import AppBar from '../components/AppBar';
import type { MetricType } from '../services/metricService';

export default function Home() {
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [logTarget, setLogTarget] = useState<MetricType | null>(null);

  return (
    <>
      <AppBar />
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* === New MetricType Form === */}
        {showTypeForm && (
          <div>
            {/* TODO: MetricTypeForm */}
            <Typography>Create new metric type form</Typography>
            <button onClick={() => setShowTypeForm(false)}>Cancel</button>
          </div>
        )}

        {/* === Log Metric Form === */}
        {logTarget && (
          <div>
            {/* TODO: MetricLogForm */}
            <Typography>Log value for {logTarget.name}</Typography>
            <button onClick={() => setLogTarget(null)}>Cancel</button>
          </div>
        )}

        {/* === Metric Cards === */}
        {/* TODO: Map over metricTypes */}
        {/* Each card has a Log button that calls setLogTarget(metricType) */}

        {/* === Explore Section === */}
        {/* TODO: Dropdowns + scatter plot */}
      </Container>
    </>
  );
}
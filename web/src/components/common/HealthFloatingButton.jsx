import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';

const ModelHealthModal = lazy(() => import('./ModelHealthModal'));

const fabStyle = {
  position: 'fixed',
  right: 20,
  bottom: 20,
  zIndex: 999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 46,
  height: 46,
  borderRadius: '50%',
  background: 'rgba(30, 30, 32, 0.92)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(52,211,153,0.08)',
  cursor: 'pointer',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
  outline: 'none',
};

const ringStyle = {
  position: 'absolute',
  inset: -3,
  borderRadius: '50%',
  border: '1.5px solid rgba(52,211,153,0.25)',
  animation: 'health-breathe 3s ease-in-out infinite',
  pointerEvents: 'none',
};

const glowStyle = {
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
  animation: 'health-glow 3s ease-in-out infinite',
  pointerEvents: 'none',
};

const keyframes = `
@keyframes health-breathe {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.18); opacity: 0.8; }
}
@keyframes health-glow {
  0%, 100% { opacity: 0.3; transform: scale(0.92); }
  50% { opacity: 0.7; transform: scale(1.05); }
}
@keyframes health-icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
`;

const HealthFloatingButton = () => {
  const location = useLocation();
  const [modalVisible, setModalVisible] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleOpen = useCallback(async () => {
    setModalVisible(true);
    setLoading(true);
    try {
      const res = await fetch('/channel_health.json');
      if (res.ok) {
        const json = await res.json();
        setHealthData(json);
      } else {
        setHealthData(null);
      }
    } catch {
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setModalVisible(false);
  }, []);

  if (location.pathname !== '/') return null;

  return (
    <>
      <style>{keyframes}</style>
      <button
        onClick={handleOpen}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          ...fabStyle,
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
          boxShadow: hovered
            ? '0 6px 28px rgba(0,0,0,0.4), 0 0 20px rgba(52,211,153,0.15)'
            : fabStyle.boxShadow,
        }}
        aria-label='Model Health'
      >
        <span style={ringStyle} />
        <span style={glowStyle} />
        <HeartPulse
          size={20}
          style={{
            position: 'relative',
            zIndex: 1,
            color: hovered ? '#6ee7b7' : '#34d399',
            transition: 'color 0.3s ease',
            animation: 'health-icon-pulse 3s ease-in-out infinite',
          }}
        />
      </button>

      {modalVisible && (
        <Suspense fallback={null}>
          <ModelHealthModal
            visible={modalVisible}
            onClose={handleClose}
            data={healthData}
            loading={loading}
          />
        </Suspense>
      )}
    </>
  );
};

export default HealthFloatingButton;

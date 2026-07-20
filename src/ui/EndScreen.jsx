// src/ui/EndScreen.jsx
import React from 'react';

// Utility to format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export default function EndScreen({ finalTime, levelId, onRetry, onExitMenu }) {
  return (
    <div className="menu-overlay">
      <div className="end-screen-container">
        <h1 className="end-screen-title text-neon-glow">¡CARRERA COMPLETADA!</h1>
        <p className="end-screen-subtitle">Has cruzado la línea de meta con éxito.</p>
        
        <div className="end-stats-box">
          <div className="end-stat-row">
            <span className="end-stat-label">Torneo</span>
            <span className="end-stat-value">
              Gran Prix - Templo del Drift
            </span>
          </div>
          <div className="end-stat-row">
            <span className="end-stat-label">Tiempo Final</span>
            <span className="end-stat-value text-neon font-mono">
              {formatTime(finalTime)}
            </span>
          </div>
        </div>
        
        <div className="end-buttons-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <button className="play-button secondary-btn" onClick={onRetry} style={{ padding: '15px', fontSize: '1.2rem', marginBottom: '10px' }}>
            JUGAR OTRA VEZ
          </button>
          <button className="end-button danger-btn" onClick={onExitMenu}>
            VOLVER AL MENÚ
          </button>
        </div>
      </div>
    </div>
  );
}

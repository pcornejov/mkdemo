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
        
        <div className="end-stats-box" style={{ width: '400px' }}>
          <div className="end-stat-row">
            <span className="end-stat-label">Torneo</span>
            <span className="end-stat-value">Gran Prix</span>
          </div>
          <div className="end-stat-row" style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>
            <span className="end-stat-label">Tiempo Final</span>
            <span className="end-stat-value text-neon font-mono">{formatTime(finalTime)}</span>
          </div>

          <h3 style={{ color: '#fff', textAlign: 'center', marginBottom: '10px' }}>Clasificación</h3>
          {leaderboard && leaderboard.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {leaderboard.map((r, idx) => (
                <div key={r.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', 
                  padding: '8px', 
                  backgroundColor: r.id.includes('Jugador') ? '#00f3ff33' : '#222',
                  borderRadius: '4px',
                  color: r.id.includes('Jugador') ? '#00f3ff' : '#aaa'
                }}>
                  <span>#{idx + 1} {r.id}</span>
                  {idx === 0 && <span style={{ color: '#ffea00' }}>🏆 GANADOR</span>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666' }}>Sin datos</div>
          )}
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

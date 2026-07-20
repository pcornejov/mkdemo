// src/ui/Menu.jsx
import React from 'react';

export default function Menu({ onSelectLevel, musicEnabled, onToggleMusic }) {
  return (
    <div className="menu-overlay">
      <div className="menu-container">
        <h1 className="menu-title">KART RACER <span className="text-neon">3D</span></h1>
        <p className="menu-subtitle">Gran Prix - 4 Jugadores</p>
        
        <div className="level-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '500px', margin: '0 auto' }}>
          <div className="level-card">
            <h2 className="level-name">Gran Prix: Templo del Drift</h2>
            <p className="level-desc">Circuito técnico con 3 rivales en pista. ¡Espera el semáforo en verde para arrancar!</p>
            
            <button 
              className="play-button"
              onClick={() => onSelectLevel(3)}
              style={{ padding: '20px', fontSize: '1.5rem', width: '100%', marginTop: '20px' }}
            >
              EMPEZAR CARRERA
            </button>
            
            <button 
              className="play-button"
              onClick={onToggleMusic}
              style={{ padding: '10px', fontSize: '1rem', width: '100%', marginTop: '10px', backgroundColor: musicEnabled ? '#222' : '#550000', border: '1px solid ' + (musicEnabled ? '#00ff88' : '#ff0000'), color: musicEnabled ? '#00ff88' : '#ff0000' }}
            >
              {musicEnabled ? '🎵 MÚSICA: SÍ' : '🔇 MÚSICA: NO'}
            </button>
          </div>
        </div>
        
        <div className="controls-hint">
          <h3>CONTROLES DE CONDUCCIÓN</h3>
          <div className="controls-list">
            <div><kbd>W</kbd> <kbd>S</kbd> / <kbd>↑</kbd> <kbd>↓</kbd> <span>Acelerar / Frenar</span></div>
            <div><kbd>A</kbd> <kbd>D</kbd> / <kbd>←</kbd> <kbd>→</kbd> <span>Girar izquierda / derecha</span></div>
            <div><kbd>Shift</kbd> <span>Derrapar (Drift) en curvas</span></div>
            <div><kbd>Espacio</kbd> <span>Boost de Nitro</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

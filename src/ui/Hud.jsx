// src/ui/Hud.jsx
import React from 'react';

export default function Hud({ onExitMenu }) {
  return (
    <div className="hud-overlay">
      {/* Top Left: Lap Counter */}
      <div className="hud-panel hud-lap">
        <span className="hud-label">VUELTA</span>
        <span id="hud-lap-value" className="hud-value">1 / 2</span>
      </div>

      {/* Top Center: Timer */}
      <div className="hud-panel hud-timer">
        <span className="hud-label">TIEMPO</span>
        <span id="hud-time-value" className="hud-value font-mono">00:00.00</span>
      </div>

      {/* Center Screen: Countdown */}
      <div className="hud-center" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        <div id="hud-countdown" className="hud-countdown-text text-neon-glow" style={{ fontSize: '10rem', fontWeight: 'bold', color: '#ffea00', textShadow: '4px 4px 0px #000' }}></div>
      </div>

      {/* Bottom Right: Speedometer & Boost Bar */}
      <div className="hud-bottom-right">
        {/* Boost/Nitro Cooldown */}
        <div className="hud-panel hud-boost">
          <div className="hud-boost-header">
            <span className="hud-label">NITRO [ESPACIO]</span>
            <span id="hud-boost-text" className="hud-boost-status">CARGADO</span>
          </div>
          <div className="hud-boost-bg">
            <div id="hud-boost-bar" className="hud-boost-fill" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Speedometer */}
        <div className="hud-panel hud-speed">
          <span id="hud-speed-value" className="hud-speed-num">0</span>
          <span className="hud-speed-unit">KM/H</span>
        </div>
      </div>

      {/* Top Right: Buttons & Helpers */}
      <div className="hud-top-right">
        <span className="hud-reset-hint">Presiona [R] para reiniciar</span>
        <button className="hud-exit-button" onClick={onExitMenu}>
          SALIR
        </button>
      </div>
    </div>
  );
}

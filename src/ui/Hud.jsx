// src/ui/Hud.jsx
import React from 'react';

export default function Hud({ onExitMenu }) {
  return (
    <div className="hud-overlay">
      {/* Top Left: Dashboard Panels */}
      <div className="hud-top-left">
        <div className="hud-panel hud-lap">
          <span className="hud-label">VUELTA</span>
          <span id="hud-lap-value" className="hud-value">1/3</span>
        </div>
        
        <div className="hud-panel hud-timer">
          <span className="hud-label">TIEMPO ACTUAL</span>
          <span id="hud-time-value" className="hud-value font-mono" style={{ fontSize: '1.6rem' }}>00:00.00</span>
        </div>
        
        <div className="hud-panel hud-lap-timer">
          <span className="hud-label">ÚLTIMA VUELTA</span>
          <span id="hud-last-lap-value" className="hud-value font-mono" style={{ fontSize: '1.4rem', color: '#ffea00' }}>--:--.--</span>
        </div>

        <div className="hud-panel hud-item">
          <span className="hud-label">OBJETO [Q]</span>
          <span id="hud-item-value" className="hud-value" style={{ color: '#00f3ff', fontSize: '1.4rem' }}>Vacío</span>
        </div>
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
      
      {/* Minimap Overlay (Top right, bottom left relative to viewport) */}
      <div id="minimap-container" style={{ position: 'absolute', bottom: '20px', left: '20px', width: '200px', height: '200px', pointerEvents: 'none' }}>
        <div id="minimap-player" style={{ 
          position: 'absolute', top: '50%', left: '50%', width: 0, height: 0,
          borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '16px solid #00f3ff',
          filter: 'drop-shadow(2px 2px 0px #000)', transformOrigin: 'center center'
        }}></div>
        <div id="minimap-rival-0" style={{ position: 'absolute', width: '8px', height: '8px', background: '#ff6600', borderRadius: '50%', filter: 'drop-shadow(1px 1px 0px #000)', display: 'none' }}></div>
        <div id="minimap-rival-1" style={{ position: 'absolute', width: '8px', height: '8px', background: '#9900ff', borderRadius: '50%', filter: 'drop-shadow(1px 1px 0px #000)', display: 'none' }}></div>
        <div id="minimap-rival-2" style={{ position: 'absolute', width: '8px', height: '8px', background: '#ff0055', borderRadius: '50%', filter: 'drop-shadow(1px 1px 0px #000)', display: 'none' }}></div>
      </div>

      {/* Top Right: Buttons & Helpers */}
      <div className="hud-top-right">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px', textAlign: 'right', fontSize: '0.8rem', color: '#ccc', textShadow: '1px 1px 0 #000' }}>
          <span>[R] Reiniciar</span>
          <span>[C] Cambiar Cámara</span>
          <span>[V] Retrovisor</span>
        </div>
        <button className="hud-exit-button" onClick={onExitMenu}>
          SALIR
        </button>
      </div>
    </div>
  );
}

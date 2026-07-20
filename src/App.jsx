// src/App.jsx
import React, { useState, useEffect } from 'react';
import Menu from './ui/Menu';
import Hud from './ui/Hud';
import EndScreen from './ui/EndScreen';
import GameCanvas from './game/GameCanvas';
import { metalMusic } from './game/engine/music';

function App() {
  const [screen, setScreen] = useState('menu'); // 'menu' | 'game' | 'end'
  const [levelId, setLevelId] = useState(1);
  const [finalTime, setFinalTime] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  const [musicEnabled, setMusicEnabled] = useState(true);

  // Play metal music when in the game screen
  useEffect(() => {
    if (screen === 'game' && musicEnabled) {
      metalMusic.play(levelId);
    } else {
      metalMusic.stop();
    }
    return () => {
      metalMusic.stop();
    };
  }, [screen, musicEnabled, levelId]);

  // We can track lap changes for any React-side analytics if needed,
  // but the live HUD is updated directly in the DOM.
  const handleLapChange = (lap, totalLaps) => {
    // console.log(`Lap ${lap}/${totalLaps}`);
  };

  const handleFinish = (time, racers) => {
    setFinalTime(time);
    setLeaderboard(racers || []);
    setScreen('end');
  };

  return (
    <div className="app-viewport">
      {screen === 'menu' && (
        <Menu 
          musicEnabled={musicEnabled}
          onToggleMusic={() => setMusicEnabled(!musicEnabled)}
          onSelectLevel={(id) => {
            setLevelId(id);
            setScreen('game');
          }} 
        />
      )}

      {screen === 'game' && (
        <div className="game-container">
          <GameCanvas
            levelId={levelId}
            onLapChange={handleLapChange}
            onFinish={handleFinish}
            onSpeedChange={() => {}}
            onBoostCooldownChange={() => {}}
          />
          <Hud 
            onExitMenu={() => setScreen('menu')} 
          />
        </div>
      )}

      {screen === 'end' && (
        <EndScreen
          finalTime={finalTime}
          levelId={levelId}
          leaderboard={leaderboard}
          onRetry={() => setScreen('game')}
          onNextLevel={() => {
            setLevelId((prev) => Math.min(prev + 1, 3));
            setScreen('game');
          }}
          onExitMenu={() => setScreen('menu')}
        />
      )}
    </div>
  );
}

export default App;

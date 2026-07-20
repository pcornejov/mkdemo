// src/game/engine/input.js

export const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  drift: false,
  boost: false,
  reset: false,
  pause: false,
  pauseTriggered: false
};

import { engineSound } from './sfx.js';

function handleKeyDown(e) {
  engineSound.start();
  switch (e.key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      keys.forward = true;
      keys.keyboardForward = true;
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      keys.backward = true;
      keys.keyboardBackward = true;
      break;
    case 'a':
    case 'A':
    case 'ArrowLeft':
      keys.left = true;
      keys.keyboardLeft = true;
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      keys.right = true;
      keys.keyboardRight = true;
      break;
    case 'Shift':
      keys.drift = true;
      keys.keyboardDrift = true;
      break;
    case ' ':
      keys.boost = true;
      break;
    case 'r':
    case 'R':
      keys.reset = true;
      break;
    case 'e':
    case 'E':
    case 'Enter':
      keys.item = true;
      keys.keyboardItem = true;
      break;
    case 'c':
    case 'C':
      keys.camToggle = true;
      break;
    case 'v':
    case 'V':
      keys.camRear = true;
      break;
    case 'Escape':
    case 'p':
    case 'P':
      if (!keys.pause) {
        keys.pauseTriggered = true;
        keys.pause = true;
      }
      break;
  }
}

function handleKeyUp(e) {
  switch (e.key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      keys.forward = false;
      keys.keyboardForward = false;
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      keys.backward = false;
      keys.keyboardBackward = false;
      break;
    case 'a':
    case 'A':
    case 'ArrowLeft':
      keys.left = false;
      keys.keyboardLeft = false;
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      keys.right = false;
      keys.keyboardRight = false;
      break;
    case 'Shift':
      keys.drift = false;
      keys.keyboardDrift = false;
      break;
    case ' ':
      keys.boost = false;
      break;
    case 'r':
    case 'R':
      keys.reset = false;
      break;
    case 'e':
    case 'E':
    case 'Enter':
      keys.item = false;
      keys.keyboardItem = false;
      break;
    case 'c':
    case 'C':
      keys.camToggle = false;
      break;
    case 'v':
    case 'V':
      keys.camRear = false;
      break;
    case 'Escape':
    case 'p':
    case 'P':
      keys.pause = false;
      break;
  }
}

export function initInput() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Return reset function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    // Reset key states
    Object.keys(keys).forEach(k => keys[k] = false);
  };
}

export function updateGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (gp) {
      engineSound.start();
      // Map right trigger to forward (accelerate)
      if (gp.buttons[7] && gp.buttons[7].pressed) keys.forward = true;
      else if (gp.buttons[7] && !gp.buttons[7].pressed && !keys.keyboardForward) keys.forward = false;
      
      // Map left trigger to backward (brake)
      if (gp.buttons[6] && gp.buttons[6].pressed) keys.backward = true;
      else if (gp.buttons[6] && !gp.buttons[6].pressed && !keys.keyboardBackward) keys.backward = false;
      
      // Face button (A or Cross) for item
      if (gp.buttons[0] && gp.buttons[0].pressed) keys.item = true;
      else if (gp.buttons[0] && !gp.buttons[0].pressed && !keys.keyboardItem) keys.item = false;
      
      // Left shoulder (L1) or face button B for drift
      if ((gp.buttons[4] && gp.buttons[4].pressed) || (gp.buttons[1] && gp.buttons[1].pressed)) keys.drift = true;
      else if (!keys.keyboardDrift) keys.drift = false;

      // Start button for pause
      if (gp.buttons[9] && gp.buttons[9].pressed) {
        if (!keys.pause) {
          keys.pauseTriggered = true;
          keys.pause = true;
        }
      } else {
        keys.pause = false;
      }

      // Analog stick steering (X axis)
      const xAxis = gp.axes[0];
      if (xAxis < -0.2) { keys.left = true; keys.right = false; }
      else if (xAxis > 0.2) { keys.right = true; keys.left = false; }
      else {
        if (!keys.keyboardLeft) keys.left = false;
        if (!keys.keyboardRight) keys.right = false;
      }
      
      // Only process the first connected gamepad
      break;
    }
  }
}

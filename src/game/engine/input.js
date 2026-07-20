// src/game/engine/input.js

export const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  drift: false,
  boost: false,
  reset: false,
  item: false,
  camToggle: false,
  camRear: false,
};

function handleKeyDown(e) {
  switch (e.key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      keys.forward = true;
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      keys.backward = true;
      break;
    case 'a':
    case 'A':
    case 'ArrowLeft':
      keys.left = true;
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      keys.right = true;
      break;
    case 'Shift':
      keys.drift = true;
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
      break;
    case 'c':
    case 'C':
      keys.camToggle = true;
      break;
    case 'v':
    case 'V':
      keys.camRear = true;
      break;
  }
}

function handleKeyUp(e) {
  switch (e.key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      keys.forward = false;
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      keys.backward = false;
      break;
    case 'a':
    case 'A':
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      keys.right = false;
      break;
    case 'Shift':
      keys.drift = false;
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
      break;
    case 'c':
    case 'C':
      keys.camToggle = false;
      break;
    case 'v':
    case 'V':
      keys.camRear = false;
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

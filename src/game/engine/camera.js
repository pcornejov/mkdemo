// src/game/engine/camera.js
import * as THREE from 'three';

let initialized = false;

export function updateCamera(camera, kartState, dt) {
  // SNES Mode 7 style camera is fixed strictly behind the player
  const distBehind = 5.0; // Close behind
  const heightAbove = 2.5; // Low to the ground

  // Direction vectors
  const headingX = Math.sin(kartState.angle);
  const headingZ = Math.cos(kartState.angle);
  const facingDir = new THREE.Vector3(headingX, 0, headingZ);
  
  const targetCamPos = kartState.pos.clone()
    .addScaledVector(facingDir, -distBehind)
    .add(new THREE.Vector3(0, heightAbove, 0));
    
  // Immediately snap camera to target position for a retro feel (no lerp)
  camera.position.copy(targetCamPos);

  // Look slightly ahead of the kart
  const targetLookAt = kartState.pos.clone()
    .addScaledVector(facingDir, 5.0)
    .add(new THREE.Vector3(0, 0.0, 0)); 

  camera.lookAt(targetLookAt);

  // Wide FOV for retro speed sensation
  camera.fov = 85;
  camera.updateProjectionMatrix();
}

export function resetCameraState() {
  initialized = false;
}

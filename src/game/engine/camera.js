// src/game/engine/camera.js
import * as THREE from 'three';

let initialized = false;

let cameraMode = 0; // 0 = Chase, 1 = First Person
let lastCamToggle = false;

export function updateCamera(camera, kartState, dt, keys) {
  // Toggle camera mode
  if (keys.camToggle && !lastCamToggle) {
    cameraMode = (cameraMode + 1) % 2;
  }
  lastCamToggle = keys.camToggle;

  const headingX = Math.sin(kartState.angle);
  const headingZ = Math.cos(kartState.angle);
  const facingDir = new THREE.Vector3(headingX, 0, headingZ);

  if (keys.camRear) {
    // Rear view
    const targetCamPos = kartState.pos.clone()
      .addScaledVector(facingDir, 5.0)
      .add(new THREE.Vector3(0, 2.5, 0));
    camera.position.copy(targetCamPos);
    
    const targetLookAt = kartState.pos.clone()
      .addScaledVector(facingDir, -5.0);
    camera.lookAt(targetLookAt);
    
  } else if (cameraMode === 0) {
    // Chase Mode
    const distBehind = 6.0;
    const heightAbove = 3.5;
    
    // Smooth camera slightly
    const targetCamPos = kartState.pos.clone()
      .addScaledVector(facingDir, -distBehind)
      .add(new THREE.Vector3(0, heightAbove, 0));
      
    camera.position.lerp(targetCamPos, 15.0 * dt);

    const targetLookAt = kartState.pos.clone()
      .addScaledVector(facingDir, 10.0)
      .add(new THREE.Vector3(0, 0.0, 0)); 
    camera.lookAt(targetLookAt);

  } else {
    // First Person Mode
    const targetCamPos = kartState.pos.clone()
      .addScaledVector(facingDir, 0.5)
      .add(new THREE.Vector3(0, 1.2, 0));
    camera.position.copy(targetCamPos);
    
    const targetLookAt = kartState.pos.clone()
      .addScaledVector(facingDir, 10.0);
    camera.lookAt(targetLookAt);
  }

  // Speed Effects: FOV warp and slight shake
  let baseFov = cameraMode === 0 ? 85 : 95;
  
  // Dramatic Slipstream/Drafting FOV pull-back
  if (kartState.draftCharge > 0) {
    baseFov += kartState.draftCharge * 15.0;
    const shakeAmt = kartState.draftCharge * 0.1;
    camera.position.x += (Math.random() - 0.5) * shakeAmt;
    camera.position.y += (Math.random() - 0.5) * shakeAmt;
  }

  if (Math.abs(kartState.speed) > 110) {
    baseFov += (Math.abs(kartState.speed) - 110) * 0.8;
    
    // Shake
    const shakeAmt = (Math.abs(kartState.speed) - 110) * 0.015;
    camera.position.x += (Math.random() - 0.5) * shakeAmt;
    camera.position.y += (Math.random() - 0.5) * shakeAmt;
  }
  
  // Smooth FOV transitions to avoid snapping
  if (!camera.userData.currentFov) camera.userData.currentFov = baseFov;
  camera.userData.currentFov = THREE.MathUtils.lerp(camera.userData.currentFov, baseFov, 5.0 * dt);
  
  camera.fov = camera.userData.currentFov;
  camera.updateProjectionMatrix();
}

export function resetCameraState() {
  initialized = false;
}

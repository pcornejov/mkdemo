import * as THREE from 'three';
import { playSound } from './sfx.js';

export function initKartState(levelData) {
  return {
    pos: new THREE.Vector3(
      levelData.startPosition.x,
      levelData.startPosition.y,
      levelData.startPosition.z
    ),
    vel: new THREE.Vector3(0, 0, 0),
    vy: 0,
    angle: levelData.startRotation,
    speed: 0,
    radius: 1.2,
    isGrounded: true,
    isDrifting: false,
    driftDir: 0,
    driftCharge: 0,
    boostTimer: 0,
    boostCooldown: 0,
    spinOutTimer: 0,
    offTrack: false
  };
}

export function checkOnTrack(pos, levelData) {
  let minDistance = Infinity;
  let closestIdx = -1;
  let isShortcut = false;

  // Check main path
  for (let i = 0; i < levelData.pathPoints.length; i++) {
    const d = pos.distanceTo(levelData.pathPoints[i]);
    if (d < minDistance) {
      minDistance = d;
      closestIdx = i;
    }
  }

  // Check shortcut if it exists
  if (levelData.shortcutPathPoints) {
    for (let i = 0; i < levelData.shortcutPathPoints.length; i++) {
      const d = pos.distanceTo(levelData.shortcutPathPoints[i]);
      if (d < minDistance) {
        minDistance = d;
        closestIdx = i;
        isShortcut = true;
      }
    }
  }

  // Widths
  const trackWidth = isShortcut ? 6.0 : 15.0;
  const margin = 2.0; // Allow slight drift off the edge before declaring off-track
  const onTrack = minDistance <= (trackWidth / 2 + margin);

  return { onTrack, closestIdx, isShortcut, minDistance };
}

export function getTrackHeight(pos, levelData) {
  let minD = Infinity;
  let height = 0;
  
  const path = levelData.pathPoints;
  const n = path.length;
  
  // Find height from main path segments
  for (let i = 0; i < n; i++) {
    const p1 = path[i];
    const p2 = path[(i + 1) % n];
    
    // Work in 3D to get correct ramp interpolation
    const ab = p2.clone().sub(p1);
    const ap = pos.clone().sub(p1);
    
    let t = ap.dot(ab) / ab.lengthSq();
    t = Math.max(0, Math.min(1, t));
    
    const closestPoint = p1.clone().addScaledVector(ab, t);
    const d = pos.distanceTo(closestPoint);
    
    if (d < minD) {
      minD = d;
      height = closestPoint.y;
    }
  }
  
  // Also check shortcut path if applicable
  if (levelData.shortcutPathPoints) {
    const sPath = levelData.shortcutPathPoints;
    const sn = sPath.length;
    for (let i = 0; i < sn; i++) {
      const p1 = sPath[i];
      const p2 = sPath[(i + 1) % sn];
      
      const ab = p2.clone().sub(p1);
      const ap = pos.clone().sub(p1);
      
      let t = ap.dot(ab) / ab.lengthSq();
      t = Math.max(0, Math.min(1, t));
      
      const closestPoint = p1.clone().addScaledVector(ab, t);
      const d = pos.distanceTo(closestPoint);
      
      if (d < minD) {
        minD = d;
        height = closestPoint.y;
      }
    }
  }
  
  return height;
}

function resolveWallCollisions(state, levelData) {
  const R = state.radius;
  const K = new THREE.Vector2(state.pos.x, state.pos.z);
  const v = new THREE.Vector2(state.vel.x, state.vel.z);
  
  const walls = [...levelData.innerWalls, ...levelData.outerWalls];
  
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    
    // Check if height matches
    const wallYMin = Math.min(wall.y1, wall.y2) - 1.0;
    const wallYMax = Math.max(wall.y1, wall.y2) + 6.0;
    if (state.pos.y < wallYMin || state.pos.y > wallYMax) {
      continue;
    }
    
    const ab = wall.p2.clone().sub(wall.p1);
    const ap = K.clone().sub(wall.p1);
    
    let t = ap.dot(ab) / ab.lengthSq();
    t = Math.max(0, Math.min(1, t));
    
    const closest = wall.p1.clone().addScaledVector(ab, t);
    const d = K.distanceTo(closest);
    
    if (d < R) {
      const normal = K.clone().sub(closest);
      if (normal.lengthSq() > 0.0001) {
        normal.normalize();
      } else {
        normal.set(-ab.y, ab.x).normalize();
      }
      
      // Reposition kart
      K.copy(closest).addScaledVector(normal, R);
      state.pos.x = K.x;
      state.pos.z = K.y;
      
      // Adjust velocity
      const vNormal = v.dot(normal);
      if (vNormal < 0) {
        v.addScaledVector(normal, -vNormal);
        state.vel.set(v.x, state.vel.y, v.y);
        state.speed = Math.max(state.speed * 0.7, -4.0); // improved bounce penalty
      }
    }
  }
}

function resolveObstacleCollisions(state, levelData) {
  // Collisions with Obstacles
  if (levelData.obstacles) {
    levelData.obstacles.forEach(obs => {
      const dx = state.pos.x - obs.x;
      const dz = state.pos.z - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < state.radius + obs.radius) {
        if (state.speed > 10) playSound('hit');
        // Simple bounce
        state.speed *= -0.5;
        // Push out
        const angleToObs = Math.atan2(dx, dz);
        state.pos.x += Math.sin(angleToObs) * 0.5;
        state.pos.z += Math.cos(angleToObs) * 0.5;
      }
    });
  }

  // Collisions with Oil Slicks
  if (levelData.oilSlicks) {
    levelData.oilSlicks.forEach(slick => {
      const dx = state.pos.x - slick.x;
      const dz = state.pos.z - slick.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < state.radius + slick.radius && state.speed > 5) {
        playSound('hit');
        // Spin out!
        state.spinOutTimer = 1.0;
        state.speed = 0;
      }
    });
  }
}

function checkBoostPads(state, levelData) {
  if (!levelData.boostPads) return;
  
  for (let i = 0; i < levelData.boostPads.length; i++) {
    const pad = levelData.boostPads[i];
    const padPos = new THREE.Vector3(pad.x, pad.y, pad.z);
    const dist = state.pos.distanceTo(padPos);
    
    // Check if player crosses the boost pad area
    if (dist < 4.5 && state.boostTimer <= 0) {
      playSound('boost');
      state.boostTimer = 1.2; // 1.2s boost
    }
  }
}

export function updatePhysics(state, keysInput, levelData, dt) {
  // Spin-out logic
  if (state.spinOutTimer > 0) {
    state.spinOutTimer -= dt;
    state.speed = 0; // stop moving
    state.angle += 15.0 * dt; // spin rapidly
    return; // skip normal movement
  }

  // 1. Cooldowns
  if (state.boostTimer > 0) {
    state.boostTimer -= dt;
  }
  if (state.boostCooldown > 0) {
    state.boostCooldown -= dt;
  }

  // Slipstream (Drafting) mechanic
  if (levelData.rivalsPos && state.speed > 50) {
    let drafting = false;
    levelData.rivalsPos.forEach(rPos => {
      // Check if player is right behind a rival
      const dist = state.pos.distanceTo(rPos);
      if (dist > 5 && dist < 25) {
        // Check angle
        const dx = rPos.x - state.pos.x;
        const dz = rPos.z - state.pos.z;
        const angleToRival = Math.atan2(dx, dz);
        let angleDiff = Math.abs(angleToRival - state.angle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (Math.abs(angleDiff) < 0.2) {
          drafting = true;
        }
      }
    });
    
    if (drafting) {
      state.draftCharge = (state.draftCharge || 0) + dt;
      if (state.draftCharge > 1.5) {
        state.boostTimer = 0.8; // Drafting boost!
        playSound('boost');
        state.draftCharge = 0;
      }
    } else {
      state.draftCharge = Math.max((state.draftCharge || 0) - dt, 0);
    }
  }

  // 2. Terrain check
  const trackInfo = checkOnTrack(state.pos, levelData);
  state.offTrack = !trackInfo.onTrack;

  let maxSpeed = 100.0;
  let accelRate = 50.0;
  
  if (state.boostTimer > 0) {
    maxSpeed = 145.0;
    accelRate = 90.0;
  } else if (state.offTrack) {
    maxSpeed = 30.0;
    accelRate = 20.0;
  }

  // Weather modifiers
  let weatherSteerMod = 1.0;
  if (levelData.weather === 'rain') {
    weatherSteerMod = 0.6; // harder to steer in rain
    accelRate *= 0.85; // less grip
  }

  // 3. User acceleration
  let accel = 0;
  if (keysInput.forward) {
    accel = accelRate;
  } else if (keysInput.backward) {
    accel = -accelRate;
  }

  // 4. Drift logic
  const steerDir = (keysInput.left ? -1 : 0) + (keysInput.right ? 1 : 0);
  
  // Hop and Gravity mechanics
  if (state.jumpVelocity === undefined) {
    state.jumpVelocity = 0;
    state.jumpOffset = 0;
  }
  
  if (keysInput.drift && steerDir !== 0 && Math.abs(state.speed) > 25.0 && !state.offTrack) {
    if (!state.isDrifting) {
      state.isDrifting = true;
      state.driftDir = steerDir;
      state.driftCharge = 0;
      // Kart Hop!
      if (state.jumpOffset <= 0.1) {
        playSound('hop');
        state.jumpVelocity = 12.0;
      }
    }
  }

  if (!keysInput.drift || Math.abs(state.speed) < 18.0 || state.offTrack) {
    if (state.isDrifting) {
      // Trigger mini-boost on release if drift was held long enough
      if (state.driftCharge > 0.8) {
        playSound('boost');
        state.speed = Math.max(state.speed, 120.0); // Boost up to 120, clamped by maxSpeed 145
        state.boostTimer = 0.8;
      } else if (state.driftCharge > 0.4) {
        playSound('boost');
        state.speed = Math.max(state.speed, 100.0);
        state.boostTimer = 0.3;
      }
      state.isDrifting = false;
      state.driftDir = 0;
    }
  }

  if (state.isDrifting) {
    state.driftCharge += dt;
  }

  // 4b. Use Item
  if (keysInput.item && state.currentItem) {
    if (state.currentItem === 'mushroom') {
      state.boostTimer = 2.0;
    } else if (state.currentItem === 'oil_slick') {
      if (!levelData.oilSlicks) levelData.oilSlicks = [];
      levelData.oilSlicks.push({
        x: state.pos.x - Math.sin(state.angle) * 5.0,
        z: state.pos.z - Math.cos(state.angle) * 5.0,
        radius: 3.5
      });
    }
    state.currentItem = null; // consume
    keysInput.item = false; // consume key
  }

  // 5. Steering calculations
  let steerSpeed = 2.8; // radians/second
  if (state.isDrifting) {
    steerSpeed = 4.0; // tighter steering during drift
    
    // In rain, drift gives less control
    if (levelData.weather === 'rain') {
      steerSpeed = 2.5;
    }
  }
  steerSpeed *= weatherSteerMod;

  // Scale steering with speed
  const speedRatio = Math.min(Math.abs(state.speed) / 35.0, 1.0);
  const steerFactor = steerSpeed * speedRatio * Math.sign(state.speed);
  
  // Update angle
  state.angle -= steerDir * steerFactor * dt;

  // Space manual boost
  if (keysInput.boost && state.boostCooldown <= 0 && !state.offTrack) {
    state.boostTimer = 1.0;
    state.boostCooldown = 4.0; // 4 second cooldown
  }

  // 6. Update speed
  if (accel !== 0) {
    state.speed += accel * dt;
  } else {
    const friction = state.offTrack ? 4.0 : 1.6;
    state.speed -= state.speed * friction * dt;
    if (Math.abs(state.speed) < 0.1) state.speed = 0;
  }

  // Smooth brake response
  if (keysInput.backward && state.speed > 0) {
    state.speed -= 80.0 * dt; // brake deceleration
  }

  // Clamp speed to terrain max
  if (state.offTrack && state.speed > maxSpeed && state.boostTimer <= 0) {
    state.speed -= (state.speed - maxSpeed) * 6.0 * dt;
  }

  const minSpeed = -10.0;
  state.speed = Math.max(minSpeed, Math.min(maxSpeed, state.speed));

  // 7. Calculate velocity vector
  const headingX = Math.sin(state.angle);
  const headingZ = Math.cos(state.angle);
  const facingDir = new THREE.Vector3(headingX, 0, headingZ);

  // Drift slip
  const lerpFactor = state.isDrifting ? 1.5 : 9.0;
  const targetVel = facingDir.clone().multiplyScalar(state.speed);
  state.vel.lerp(targetVel, lerpFactor * dt);

  // Position update
  state.pos.x += state.vel.x * dt;
  state.pos.z += state.vel.z * dt;

  // 8. Height / Gravity
  const trackHeight = getTrackHeight(state.pos, levelData);
  
  if (state.pos.y > trackHeight + 0.05) {
    state.vy -= 22.0 * dt;
    state.pos.y += state.vy * dt;
    state.isGrounded = false;
    
    if (state.pos.y <= trackHeight) {
      state.pos.y = trackHeight;
      state.vy = 0;
      state.isGrounded = true;
    }
  } else {
    state.pos.y = trackHeight;
    state.vy = 0;
    state.isGrounded = true;
  }
  
  // Apply jump hop
  if (state.jumpOffset > 0 || state.jumpVelocity > 0) {
    state.jumpOffset += state.jumpVelocity * dt;
    state.jumpVelocity -= 40.0 * dt; // gravity
    if (state.jumpOffset <= 0) {
      state.jumpOffset = 0;
      state.jumpVelocity = 0;
    }
  }

  // Final y with hop offset
  state.pos.y += state.jumpOffset;

  // 9. Resolve colliders
  resolveWallCollisions(state, levelData);
  resolveObstacleCollisions(state, levelData);
  checkBoostPads(state, levelData);
  
  // Item Boxes
  if (levelData.itemBoxes) {
    levelData.itemBoxes.forEach(box => {
      if (box.active === false) return;
      const dx = state.pos.x - box.x;
      const dz = state.pos.z - box.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < state.radius + 3.0) {
        box.active = false; // collect box
        playSound('item');
        // Give random item
        const items = ['mushroom', 'oil_slick', 'mushroom'];
        state.currentItem = items[Math.floor(Math.random() * items.length)];
        
        // respawn box after 5 seconds
        setTimeout(() => { box.active = true; }, 5000);
      }
    });
  }

  return trackInfo;
}

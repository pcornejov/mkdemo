// src/game/engine/ai.js
import * as THREE from 'three';
import { createKartMesh, updateKartVisuals } from './kart.js';
import { getTrackHeight } from './physics.js';

const RIVAL_COLORS = [0xff6600, 0x9900ff, 0xff0055];

export function createRival(levelData, index) {
  const color = RIVAL_COLORS[index % RIVAL_COLORS.length];
  const mesh = createKartMesh(color);
  
  // Start at exactly the level's start position (offsets handled by grid setup)
  const startPos = new THREE.Vector3(
    levelData.startPosition.x,
    levelData.startPosition.y,
    levelData.startPosition.z
  );
  
  mesh.position.copy(startPos);
  mesh.rotation.y = levelData.startRotation;

  return {
    mesh,
    pos: startPos,
    vel: new THREE.Vector3(0, 0, 0),
    angle: levelData.startRotation,
    speed: 0,
    radius: 1.2,
    spinOutTimer: 0,
    currentWaypointIdx: Math.floor(levelData.pathPoints.length * 0.05), // start a bit ahead of spawn
    maxSpeed: levelData.rivalSpeed * (0.9 + Math.random() * 0.15), // slight speed variance
    color
  };
}

export function updateRivals(rivals, playerState, levelData, dt) {
  const path = levelData.pathPoints;
  const n = path.length;

  // 1. Move each rival towards its next waypoint
  rivals.forEach(rival => {
    if (rival.spinOutTimer > 0) {
      rival.spinOutTimer -= dt;
      rival.speed = 0;
      rival.angle += 15.0 * dt;
      rival.mesh.rotation.y = rival.angle;
      updateKartVisuals(rival.mesh, 0, 0, dt, false);
      return;
    }

    const target = path[rival.currentWaypointIdx];
    
    // Vector to target in XZ plane
    let dx = target.x - rival.pos.x;
    let dz = target.z - rival.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // If close to waypoint, target the next one
    if (dist < 15.0) {
      rival.currentWaypointIdx = (rival.currentWaypointIdx + 1) % n;
    }

    // --- Obstacle Avoidance ---
    let avoidanceForceX = 0;
    let avoidanceForceZ = 0;
    if (levelData.obstacles) {
      levelData.obstacles.forEach(obs => {
        const ox = obs.x - rival.pos.x;
        const oz = obs.z - rival.pos.z;
        const oDistSq = ox * ox + oz * oz;
        // Avoid if within 25 units
        if (oDistSq < 625 && oDistSq > 0) {
          const oDist = Math.sqrt(oDistSq);
          // Push vector away from obstacle
          avoidanceForceX -= (ox / oDist) * (25 - oDist);
          avoidanceForceZ -= (oz / oDist) * (25 - oDist);
        }
      });
    }

    // Blend avoidance force with target vector
    dx += avoidanceForceX * 0.8;
    dz += avoidanceForceZ * 0.8;

    // Steering calculations
    const targetAngle = Math.atan2(dx, dz);
    let diff = targetAngle - rival.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // Normalize to [-PI, PI]

    // AI steering speed (higher at high speeds to maintain control)
    const maxSteer = 3.5;
    const steerInput = Math.sign(diff);
    rival.angle += steerInput * Math.min(Math.abs(diff), maxSteer * dt);

    // Speed logic: slow down on sharp turns
    let targetSpeed = rival.maxSpeed;
    if (Math.abs(diff) > 0.6) {
      targetSpeed *= 0.55; // brake on tight curves
    }
    
    // Rubber-banding: adjust speed based on distance to player
    const distToPlayerXZ = new THREE.Vector2(playerState.pos.x - rival.pos.x, playerState.pos.z - rival.pos.z);
    // Rough heuristic: if AI is ahead, distToPlayer Z in local space is negative. We'll use a simpler metric:
    // We just check who is closer to the next waypoint or just use absolute distance for a generic rubber band.
    // A better approach: If player speed is high and distance is large, maybe the player is behind or ahead.
    // For simplicity, we just scale AI speed towards the player's speed if they are far away.
    const distToPlayer = distToPlayerXZ.length();
    
    // Determine if rival is ahead of player by dot product of player's heading
    const pHeading = new THREE.Vector2(Math.sin(playerState.angle), Math.cos(playerState.angle));
    const isPlayerBehind = pHeading.dot(distToPlayerXZ) > 0; // AI is in front of player
    
    if (isPlayerBehind && distToPlayer > 50) {
      // AI is far ahead, slow them down slightly so player can catch up
      targetSpeed = Math.min(targetSpeed, playerState.speed * 0.8 + 20);
    } else if (!isPlayerBehind && distToPlayer > 100) {
      // AI is far behind, speed them up
      targetSpeed = Math.max(targetSpeed, playerState.speed * 1.1 + 10);
    }

    // Smooth speed change
    rival.speed = THREE.MathUtils.lerp(rival.speed, targetSpeed, 2.5 * dt);

    // Update position XZ
    rival.pos.x += Math.sin(rival.angle) * rival.speed * dt;
    rival.pos.z += Math.cos(rival.angle) * rival.speed * dt;

    // Ground snap
    const trackY = getTrackHeight(rival.pos, levelData);
    rival.pos.y = trackY;

    // Update mesh transform
    rival.mesh.position.copy(rival.pos);
    rival.mesh.rotation.y = rival.angle;

    // Animate wheels
    updateKartVisuals(rival.mesh, rival.speed, steerInput * Math.min(Math.abs(diff), 1.0), dt, false);

    // AI Item Boxes Collection
    if (levelData.itemBoxes) {
      levelData.itemBoxes.forEach(box => {
        if (!box.active) return;
        const bx = rival.pos.x - box.x;
        const bz = rival.pos.z - box.z;
        if (Math.sqrt(bx * bx + bz * bz) < rival.radius + 3.0) {
          box.active = false;
          const items = ['mushroom', 'oil_slick', 'mushroom'];
          rival.currentItem = items[Math.floor(Math.random() * items.length)];
          setTimeout(() => { box.active = true; }, 5000);
        }
      });
    }

    // AI Item Usage
    if (rival.currentItem && Math.random() < 0.02) { // 2% chance per frame to use
      if (rival.currentItem === 'mushroom') {
        rival.speed = Math.max(rival.speed, 120);
      } else if (rival.currentItem === 'oil_slick') {
        if (!levelData.oilSlicks) levelData.oilSlicks = [];
        levelData.oilSlicks.push({ x: rival.pos.x, z: rival.pos.z, radius: 2.0 });
      }
      rival.currentItem = null;
    }

    // Collisions with Oil Slicks for AI
    if (levelData.oilSlicks) {
      levelData.oilSlicks.forEach(slick => {
        const dx = rival.pos.x - slick.x;
        const dz = rival.pos.z - slick.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < rival.radius + slick.radius && rival.speed > 5) {
          rival.spinOutTimer = 1.0;
          rival.speed = 0;
        }
      });
    }
  });

  // 2. Resolve Collisions: Rival vs Player
  const R_total = 2.4; // 1.2 + 1.2
  rivals.forEach(rival => {
    const dXZ = new THREE.Vector2(playerState.pos.x - rival.pos.x, playerState.pos.z - rival.pos.z);
    const dist = dXZ.length();
    
    if (dist < R_total) {
      const normal = dXZ.normalize();
      const overlap = R_total - dist;
      
      // Push both away
      playerState.pos.x += normal.x * overlap * 0.5;
      playerState.pos.z += normal.y * overlap * 0.5;
      
      rival.pos.x -= normal.x * overlap * 0.5;
      rival.pos.z -= normal.y * overlap * 0.5;

      // Transfer speeds / recoil
      const speedDiff = playerState.speed - rival.speed;
      playerState.speed = Math.max(playerState.speed - speedDiff * 0.3, -5.0);
      rival.speed = Math.max(rival.speed + speedDiff * 0.3, 0);
    }
  });

  // 3. Resolve Collisions: Rival vs Rival
  for (let i = 0; i < rivals.length; i++) {
    for (let j = i + 1; j < rivals.length; j++) {
      const r1 = rivals[i];
      const r2 = rivals[j];
      
      const dXZ = new THREE.Vector2(r1.pos.x - r2.pos.x, r1.pos.z - r2.pos.z);
      const dist = dXZ.length();
      
      if (dist < R_total) {
        const normal = dXZ.normalize();
        const overlap = R_total - dist;
        
        r1.pos.x += normal.x * overlap * 0.5;
        r1.pos.z += normal.y * overlap * 0.5;
        
        r2.pos.x -= normal.x * overlap * 0.5;
        r2.pos.z -= normal.y * overlap * 0.5;
        
        // Swap speeds slightly
        const temp = r1.speed;
        r1.speed = Math.max(r2.speed, 0);
        r2.speed = Math.max(temp, 0);
      }
    }
  }
}

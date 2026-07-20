// src/game/engine/kart.js
import * as THREE from 'three';

export function createKartMesh(colorHex = 0xff0000) {
  const group = new THREE.Group();

  // Material Palette
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6, metalness: 0.2 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4, metalness: 0.8 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.2 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.5 });
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.6, metalness: 0.5 });
  const exhaustGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

  // 1. Pipe Frame Chassis (Simple boxes to look like pipes)
  // Left and Right main rails
  const railGeom = new THREE.BoxGeometry(0.1, 0.1, 1.8);
  const leftRail = new THREE.Mesh(railGeom, pipeMat);
  leftRail.position.set(-0.4, 0.2, 0);
  group.add(leftRail);

  const rightRail = new THREE.Mesh(railGeom, pipeMat);
  rightRail.position.set(0.4, 0.2, 0);
  group.add(rightRail);

  // Front and Back cross rails
  const crossGeom = new THREE.BoxGeometry(0.9, 0.1, 0.1);
  const frontRail = new THREE.Mesh(crossGeom, pipeMat);
  frontRail.position.set(0, 0.2, 0.85);
  group.add(frontRail);

  const backRail = new THREE.Mesh(crossGeom, pipeMat);
  backRail.position.set(0, 0.2, -0.85);
  group.add(backRail);

  // Front bumper curve (simple box)
  const bumperGeom = new THREE.BoxGeometry(0.5, 0.1, 0.1);
  const bumper = new THREE.Mesh(bumperGeom, bodyMat);
  bumper.position.set(0, 0.2, 0.95);
  group.add(bumper);

  // 2. Wheels (Small and simple)
  const wheelGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8);
  wheelGeom.rotateZ(Math.PI / 2);

  const flWheel = new THREE.Mesh(wheelGeom, tireMat);
  const frWheel = new THREE.Mesh(wheelGeom, tireMat);
  const blWheel = new THREE.Mesh(wheelGeom, tireMat);
  const brWheel = new THREE.Mesh(wheelGeom, tireMat);

  // Simple gray hubs
  const hubGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.22, 6);
  hubGeom.rotateZ(Math.PI / 2);
  const addHub = (wheel) => {
    const hub = new THREE.Mesh(hubGeom, engineMat);
    wheel.add(hub);
  };
  addHub(flWheel);
  addHub(frWheel);
  addHub(blWheel);
  addHub(brWheel);

  const flPivot = new THREE.Group();
  const frPivot = new THREE.Group();

  flPivot.position.set(-0.5, 0.25, 0.7);
  frPivot.position.set(0.5, 0.25, 0.7);
  blWheel.position.set(-0.5, 0.25, -0.7);
  brWheel.position.set(0.5, 0.25, -0.7);

  flWheel.position.set(0, 0, 0);
  frWheel.position.set(0, 0, 0);

  flPivot.add(flWheel);
  frPivot.add(frWheel);

  group.add(flPivot);
  group.add(frPivot);
  group.add(blWheel);
  group.add(brWheel);

  group.userData = {
    wheels: [flWheel, frWheel, blWheel, brWheel],
    frontPivots: [flPivot, frPivot]
  };

  // 3. Seat & Engine
  const seatGeom = new THREE.BoxGeometry(0.6, 0.4, 0.4);
  const seat = new THREE.Mesh(seatGeom, bodyMat);
  seat.position.set(0, 0.4, -0.2);
  group.add(seat);

  const engineBaseGeom = new THREE.BoxGeometry(0.5, 0.3, 0.4);
  const engineBase = new THREE.Mesh(engineBaseGeom, engineMat);
  engineBase.position.set(0, 0.35, -0.6);
  group.add(engineBase);

  // Exhaust
  const exhaustGeom = new THREE.BoxGeometry(0.15, 0.15, 0.3);
  const exhaust = new THREE.Mesh(exhaustGeom, engineMat);
  exhaust.position.set(0, 0.35, -0.9);
  group.add(exhaust);

  const glowGeom = new THREE.PlaneGeometry(0.12, 0.12);
  const glow = new THREE.Mesh(glowGeom, exhaustGlowMat);
  glow.position.set(0, 0.35, -1.06);
  glow.rotation.y = Math.PI;
  group.add(glow);
  group.userData.exhaustGlow = glow;

  // 4. Steering Wheel & Column
  const columnGeom = new THREE.BoxGeometry(0.05, 0.5, 0.05);
  const column = new THREE.Mesh(columnGeom, pipeMat);
  column.position.set(0, 0.5, 0.4);
  column.rotation.x = -Math.PI / 6;
  group.add(column);

  const wheelRingGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8);
  const wheelRing = new THREE.Mesh(wheelRingGeom, darkMat);
  wheelRing.position.set(0, 0.7, 0.3);
  wheelRing.rotation.x = Math.PI / 3;
  group.add(wheelRing);

  // 5. Driver Placeholder (A simple blocky driver to emulate SNES sprites)
  const driverBodyGeom = new THREE.BoxGeometry(0.4, 0.4, 0.3);
  const driverBody = new THREE.Mesh(driverBodyGeom, bodyMat);
  driverBody.position.set(0, 0.6, -0.2);
  group.add(driverBody);

  const driverHeadGeom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const driverHead = new THREE.Mesh(driverHeadGeom, skinMat);
  driverHead.position.set(0, 0.95, -0.2);
  group.add(driverHead);

  // Enable shadows for all kart parts
  group.traverse((child) => {
    if (child.isMesh && child.material !== exhaustGlowMat) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

export function updateKartVisuals(group, speed, steerInput, dt, boostActive) {
  if (!group || !group.userData) return;

  const { wheels, frontPivots, exhaustGlow } = group.userData;

  const spinFactor = 3.0;
  wheels.forEach(wheel => {
    wheel.rotation.x += speed * spinFactor * dt;
  });

  const maxSteerAngle = 0.5;
  frontPivots.forEach(pivot => {
    pivot.rotation.y = -steerInput * maxSteerAngle;
  });

  if (exhaustGlow) {
    if (boostActive) {
      exhaustGlow.material.color.setHex(0x00ff88);
      exhaustGlow.scale.set(3, 3, 1);
    } else {
      exhaustGlow.material.color.setHex(0xffaa00);
      const pulse = 1.0 + Math.sin(performance.now() * 0.05) * 0.5;
      exhaustGlow.scale.set(pulse, pulse, 1);
    }
  }
}

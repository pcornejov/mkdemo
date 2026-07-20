// src/game/GameCanvas.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { initInput, keys } from './engine/input.js';
import { getLevelData } from './engine/levels.js';
import { initKartState, updatePhysics } from './engine/physics.js';
import { createKartMesh, updateKartVisuals } from './engine/kart.js';
import { updateCamera, resetCameraState } from './engine/camera.js';
import { createRival, updateRivals } from './engine/ai.js';

// Helper to create visual double-sided 3D neon walls from line segments
function createVisualWalls(walls, colorHex) {
  const vertices = [];
  const indices = [];
  let vertCount = 0;
  const wallHeight = 1.0;

  walls.forEach(wall => {
    const v0x = wall.p1.x, v0y = wall.y1, v0z = wall.p1.y;
    const v1x = wall.p2.x, v1y = wall.y2, v1z = wall.p2.y;
    const v2x = wall.p1.x, v2y = wall.y1 + wallHeight, v2z = wall.p1.y;
    const v3x = wall.p2.x, v3y = wall.y2 + wallHeight, v3z = wall.p2.y;

    vertices.push(v0x, v0y, v0z); // 0
    vertices.push(v1x, v1y, v1z); // 1
    vertices.push(v2x, v2y, v2z); // 2
    vertices.push(v3x, v3y, v3z); // 3

    const base = vertCount;
    // Side 1
    indices.push(base, base + 1, base + 2);
    indices.push(base + 2, base + 1, base + 3);
    // Side 2 (double-sided)
    indices.push(base + 1, base, base + 2);
    indices.push(base + 1, base + 2, base + 3);

    vertCount += 4;
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.8,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(geom, mat);
}

export default function GameCanvas({ levelId, onLapChange, onFinish, onSpeedChange, onBoostCooldownChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let animationFrameId;
    let cleanupInput = initInput();
    resetCameraState();

    // 1. Get Level Configuration
    const levelData = getLevelData(levelId);
    if (!levelData) return;

    // 2. Setup Three.js Scene, Camera & Renderer
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(levelData.skyColor);
    scene.fog = new THREE.FogExp2(levelData.skyColor, 0.007);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000); // 3D FOV
    
    // Minimap Camera (Orthographic)
    const minimapSize = 300;
    const minimapCamera = new THREE.OrthographicCamera(-minimapSize, minimapSize, minimapSize, -minimapSize, 1, 1000);
    minimapCamera.position.set(0, 500, 0);
    minimapCamera.lookAt(0, 0, 0);
    minimapCamera.rotation.z = Math.PI / 2; // Orient correctly

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true }); 
    renderer.setSize(width, height); 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.autoClear = false; // We will clear manually for two passes
    canvasRef.current.style.imageRendering = 'auto';
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(levelData.ambientColor, 2.0);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 300;
    const dSide = 120;
    dirLight.shadow.camera.left = -dSide;
    dirLight.shadow.camera.right = dSide;
    dirLight.shadow.camera.top = dSide;
    dirLight.shadow.camera.bottom = -dSide;
    scene.add(dirLight);

    // 4. Build Environment / Ground
    const groundGeom = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: levelData.groundColor,
      roughness: 0.95,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2; // slightly below track
    ground.receiveShadow = true;
    scene.add(ground);

    // Environment Decor: Trees, Rocks, Bushes, Clouds
    const decorGroup = new THREE.Group();
    scene.add(decorGroup);

    // Geometries
    const treeTrunkGeom = new THREE.CylinderGeometry(0.5, 0.8, 3, 6);
    const treeTopGeom = new THREE.ConeGeometry(3.5, 6, 7);
    const bushGeom = new THREE.DodecahedronGeometry(1.5, 0);
    const rockGeom = new THREE.DodecahedronGeometry(2.0, 1);
    const cloudGeom = new THREE.SphereGeometry(4, 7, 7);

    // Materials
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const topMats = [
      new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x2d9e2d, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x1a6b1a, roughness: 0.9 })
    ];
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.8, metalness: 0.2 });
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, flatShading: true });

    // 1. Scatter Trees, Bushes, and Rocks
    levelData.obstacles = [...(levelData.obstacles || [])];
    for (let i = 0; i < 400; i++) {
      const rx = (Math.random() - 0.5) * 1200;
      const rz = (Math.random() - 0.5) * 1200;
      
      // Avoid center track area
      if (Math.abs(rx) < 90 && Math.abs(rz) < 90) continue;

      const type = Math.random();
      const obj = new THREE.Group();
      obj.position.set(rx, 0, rz);

      if (type < 0.6) {
        // Tree
        const trunk = new THREE.Mesh(treeTrunkGeom, trunkMat);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        
        const top = new THREE.Mesh(treeTopGeom, topMats[Math.floor(Math.random() * topMats.length)]);
        top.position.y = 4.5;
        top.castShadow = true;
        top.receiveShadow = true;
        
        obj.add(trunk);
        obj.add(top);
        
        const s = 0.6 + Math.random() * 0.8;
        obj.scale.set(s, s, s);
        levelData.obstacles.push({ x: rx, z: rz, radius: s * 1.5, type: 'decor' });
      } else if (type < 0.85) {
        // Bush
        const bush = new THREE.Mesh(bushGeom, topMats[Math.floor(Math.random() * topMats.length)]);
        bush.position.y = 0.5;
        bush.castShadow = true;
        bush.receiveShadow = true;
        obj.add(bush);
        
        const s = 0.8 + Math.random() * 1.2;
        obj.scale.set(s, s, s);
        levelData.obstacles.push({ x: rx, z: rz, radius: s * 1.2, type: 'decor' });
      } else {
        // Rock
        const rock = new THREE.Mesh(rockGeom, rockMat);
        rock.position.y = 0.2;
        rock.castShadow = true;
        rock.receiveShadow = true;
        obj.add(rock);
        
        const s = 0.5 + Math.random() * 1.5;
        obj.scale.set(s, s * 0.7, s); // squashed rock
        levelData.obstacles.push({ x: rx, z: rz, radius: s * 2.0, type: 'decor' });
      }

      obj.rotation.y = Math.random() * Math.PI;
      decorGroup.add(obj);
    }

    // 2. Scatter Clouds in the sky
    for (let i = 0; i < 25; i++) {
      const rx = (Math.random() - 0.5) * 600;
      const ry = 40 + Math.random() * 30; // High in the sky
      const rz = (Math.random() - 0.5) * 600;

      const cloud = new THREE.Group();
      cloud.position.set(rx, ry, rz);

      // A cloud is a cluster of 3-5 spheres
      const parts = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < parts; p++) {
        const mesh = new THREE.Mesh(cloudGeom, cloudMat);
        mesh.position.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 8
        );
        const s = 0.5 + Math.random() * 0.8;
        mesh.scale.set(s, s, s);
        cloud.add(mesh);
      }
      decorGroup.add(cloud);
    }

    // Weather Effects
    let rainSystem = null;
    if (levelData.weather === 'rain') {
      const rainCount = 1500;
      const rainGeom = new THREE.BufferGeometry();
      const rainPositions = new Float32Array(rainCount * 3);
      for (let i = 0; i < rainCount; i++) {
        rainPositions[i*3] = (Math.random() - 0.5) * 100; // x around camera
        rainPositions[i*3+1] = Math.random() * 40; // y height
        rainPositions[i*3+2] = (Math.random() - 0.5) * 100; // z around camera
      }
      rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
      
      const rainMat = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.2,
        transparent: true,
        opacity: 0.6
      });
      
      rainSystem = new THREE.Points(rainGeom, rainMat);
      scene.add(rainSystem);
    }

    // 5. Create Track Meshes
    const trackMeshes = [];
    levelData.geometries.forEach(geomCfg => {
      const trackMat = new THREE.MeshStandardMaterial({
        color: geomCfg.color,
        roughness: 0.5,
        metalness: 0.3
      });
      const trackMesh = new THREE.Mesh(geomCfg.geometry, trackMat);
      trackMesh.receiveShadow = true;
      trackMesh.castShadow = true;
      scene.add(trackMesh);
      trackMeshes.push(trackMesh);
    });

    // Add glowing visual walls
    const innerWallMesh = createVisualWalls(levelData.innerWalls, levelData.wallColor);
    const outerWallMesh = createVisualWalls(levelData.outerWalls, levelData.wallColor);
    scene.add(innerWallMesh);
    scene.add(outerWallMesh);

    // 6. Draw Checkpoint Lines / Visual Indicators (Finish line etc.)
    // Finish line (Checkpoint 0)
    const finishLineGroup = new THREE.Group();
    const startPoint = levelData.pathPoints[0];
    finishLineGroup.position.copy(startPoint);
    
    // Find direction perpendicular to path for the overhead banner
    const nextPoint = levelData.pathPoints[1];
    const prevPoint = levelData.pathPoints[levelData.pathPoints.length - 1];
    const pathDir = new THREE.Vector3().subVectors(nextPoint, prevPoint).normalize();
    const bannerNormal = new THREE.Vector3(-pathDir.z, 0, pathDir.x).normalize();
    
    // Overhead Arch
    const pillarGeom = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
    
    const leftPillar = new THREE.Mesh(pillarGeom, pillarMat);
    leftPillar.position.copy(bannerNormal.clone().multiplyScalar(-8));
    leftPillar.position.y = 3;
    leftPillar.castShadow = true;
    finishLineGroup.add(leftPillar);
    
    const rightPillar = leftPillar.clone();
    rightPillar.position.copy(bannerNormal.clone().multiplyScalar(8));
    rightPillar.position.y = 3;
    rightPillar.castShadow = true;
    finishLineGroup.add(rightPillar);
    
    const crossbarGeom = new THREE.BoxGeometry(0.3, 0.6, 16.5);
    const crossbarMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
    const crossbar = new THREE.Mesh(crossbarGeom, crossbarMat);
    crossbar.position.set(0, 6, 0);
    // Align crossbar with bannerNormal
    const angle = Math.atan2(bannerNormal.x, bannerNormal.z);
    crossbar.rotation.y = angle;
    finishLineGroup.add(crossbar);

    // Neon START sign
    const signGeom = new THREE.BoxGeometry(0.1, 0.8, 4);
    const signMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const sign = new THREE.Mesh(signGeom, signMat);
    sign.position.set(0, 6, 0);
    sign.rotation.y = angle + Math.PI / 2;
    finishLineGroup.add(sign);

    // Traffic Light (Semáforo)
    const trafficLightGroup = new THREE.Group();
    const boxGeom = new THREE.BoxGeometry(0.6, 2.5, 0.6);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
    const tlBox = new THREE.Mesh(boxGeom, boxMat);
    trafficLightGroup.add(tlBox);

    const lightGeom = new THREE.SphereGeometry(0.3, 16, 16);
    const redMat1 = new THREE.MeshBasicMaterial({ color: 0x330000 });
    const redMat2 = new THREE.MeshBasicMaterial({ color: 0x330000 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x003300 });

    const redLight1 = new THREE.Mesh(lightGeom, redMat1);
    redLight1.position.set(0, 0.8, 0.35);
    trafficLightGroup.add(redLight1);

    const redLight2 = new THREE.Mesh(lightGeom, redMat2);
    redLight2.position.set(0, 0, 0.35);
    trafficLightGroup.add(redLight2);

    const greenLight = new THREE.Mesh(lightGeom, greenMat);
    greenLight.position.set(0, -0.8, 0.35);
    trafficLightGroup.add(greenLight);

    trafficLightGroup.position.set(0, 5, 0);
    trafficLightGroup.rotation.y = angle + Math.PI / 2;
    finishLineGroup.add(trafficLightGroup);

    scene.add(finishLineGroup);

    // 7. Place Obstacles & Boost Pads
    const obstacleMeshes = [];
    if (levelData.obstacles) {
      levelData.obstacles.forEach(obs => {
        if (obs.type === 'decor') return; // Decor is rendered separately
        
        const coneGroup = new THREE.Group();
        coneGroup.position.set(obs.x, obs.y, obs.z);
        
        const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.6, metalness: 0.1 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });
        
        // Cone Base
        const baseGeom = new THREE.BoxGeometry(obs.radius * 1.8, 0.1, obs.radius * 1.8);
        const base = new THREE.Mesh(baseGeom, orangeMat);
        base.position.y = 0.05;
        base.castShadow = true;
        base.receiveShadow = true;
        coneGroup.add(base);
        
        // Main Cone
        const coneGeom = new THREE.ConeGeometry(obs.radius * 0.8, 2.0, 10);
        const cone = new THREE.Mesh(coneGeom, orangeMat);
        cone.position.y = 1.0;
        cone.castShadow = true;
        coneGroup.add(cone);
        
        // White reflective stripe in the middle
        const stripeGeom = new THREE.CylinderGeometry(obs.radius * 0.35, obs.radius * 0.52, 0.5, 10);
        const stripe = new THREE.Mesh(stripeGeom, whiteMat);
        stripe.position.y = 1.0;
        coneGroup.add(stripe);
        
        scene.add(coneGroup);
        // Push the group to obstacleMeshes so that it's correctly disposed on exit
        obstacleMeshes.push(coneGroup);
      });
    }

    if (levelData.oilSlicks) {
      levelData.oilSlicks.forEach(slick => {
        const slickGeom = new THREE.CircleGeometry(slick.radius, 16);
        const slickMat = new THREE.MeshStandardMaterial({ 
          color: 0x111111, 
          roughness: 0.1, // glossy
          metalness: 0.8,
          transparent: true,
          opacity: 0.85
        });
        const slickMesh = new THREE.Mesh(slickGeom, slickMat);
        slickMesh.rotation.x = -Math.PI / 2;
        slickMesh.position.set(slick.x, slick.y + 0.02, slick.z); // slightly above ground
        slickMesh.receiveShadow = true;
        scene.add(slickMesh);
        obstacleMeshes.push(slickMesh); // push here for cleanup
      });
    }

    const boostPadMeshes = [];
    if (levelData.boostPads) {
      levelData.boostPads.forEach(pad => {
        // Green glowing arrow/pad
        const padGeom = new THREE.PlaneGeometry(pad.width, pad.length);
        const padMat = new THREE.MeshBasicMaterial({
          color: 0x00ff88,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const padMesh = new THREE.Mesh(padGeom, padMat);
        padMesh.rotation.x = -Math.PI / 2;
        padMesh.position.set(pad.x, pad.y + 0.05, pad.z);
        scene.add(padMesh);
        boostPadMeshes.push(padMesh);
      });
    }

    const itemBoxMeshes = [];
    if (levelData.itemBoxes) {
      const boxGeom = new THREE.BoxGeometry(2.5, 2.5, 2.5);
      levelData.itemBoxes.forEach(box => {
        const boxMat = new THREE.MeshStandardMaterial({
          color: 0xff00ff, // Magenta
          emissive: 0xaa00aa,
          transparent: true,
          opacity: 0.8,
          wireframe: true
        });
        const boxMesh = new THREE.Mesh(boxGeom, boxMat);
        boxMesh.position.set(box.x, box.y, box.z);
        scene.add(boxMesh);
        itemBoxMeshes.push({ mesh: boxMesh, data: box });
      });
    }

    // Grid Positions Helper
    const startDir = new THREE.Vector3(Math.sin(levelData.startRotation), 0, Math.cos(levelData.startRotation));
    const rightDir = new THREE.Vector3(-startDir.z, 0, startDir.x);
    
    // 8. Player Kart Setup (Pole Position)
    const kartMesh = createKartMesh(0x00f3ff); // Cyan player
    
    // Headlights
    if (levelData.ambientColor < 0x555555 || levelData.weather === 'rain') {
      const headlight1 = new THREE.SpotLight(0xffffee, 2.0, 100, Math.PI / 6, 0.5, 1);
      headlight1.position.set(-0.6, 0.5, -1);
      headlight1.target.position.set(-0.6, 0, -10);
      kartMesh.add(headlight1);
      kartMesh.add(headlight1.target);
      
      const headlight2 = new THREE.SpotLight(0xffffee, 2.0, 100, Math.PI / 6, 0.5, 1);
      headlight2.position.set(0.6, 0.5, -1);
      headlight2.target.position.set(0.6, 0, -10);
      kartMesh.add(headlight2);
      kartMesh.add(headlight2.target);
    }
    
    scene.add(kartMesh);

    let kartState = initKartState(levelData);
    // Offset player: front left
    kartState.pos.addScaledVector(startDir, 2).addScaledVector(rightDir, -3);
    kartMesh.position.copy(kartState.pos);
    kartMesh.rotation.y = kartState.angle;

    // 9. Rivals Setup
    const rivals = [];
    for (let i = 0; i < levelData.rivalCount; i++) {
      const rival = createRival(levelData, i);
      
      // Grid offsets for rivals (2nd, 3rd, 4th)
      if (i === 0) rival.pos.addScaledVector(startDir, 0).addScaledVector(rightDir, 3);
      if (i === 1) rival.pos.addScaledVector(startDir, -4).addScaledVector(rightDir, -3);
      if (i === 2) rival.pos.addScaledVector(startDir, -6).addScaledVector(rightDir, 3);

      rival.mesh.position.copy(rival.pos);
      scene.add(rival.mesh);
      rivals.push(rival);
    }

    // 10. Particle System (Drift sparks, boost flames)
    const particles = [];
    const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    
    function spawnParticles(position, colorHex, count = 2, speedScale = 1.0) {
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 });
        const pMesh = new THREE.Mesh(particleGeometry, mat);
        pMesh.position.copy(position);
        // Random slight offsets
        pMesh.position.x += (Math.random() - 0.5) * 0.5;
        pMesh.position.y += (Math.random() - 0.5) * 0.2;
        pMesh.position.z += (Math.random() - 0.5) * 0.5;

        scene.add(pMesh);

        particles.push({
          mesh: pMesh,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 6 * speedScale,
            Math.random() * 4 * speedScale + 1,
            (Math.random() - 0.5) * 6 * speedScale
          ),
          life: 0.5 + Math.random() * 0.3,
          maxLife: 0.8
        });
      }
    }

    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          particles.splice(i, 1);
        } else {
          // Move
          p.mesh.position.addScaledVector(p.vel, dt);
          // Apply gravity to particles
          p.vel.y -= 9.8 * dt;
          // Scale down
          const pct = p.life / p.maxLife;
          p.mesh.scale.set(pct, pct, pct);
          p.mesh.material.opacity = pct;
        }
      }
    }

    // 11. Game State Variables
    let currentLap = 1;
    const totalLaps = levelData.laps;
    let nextCheckpointIndex = 0;
    let elapsedTime = 0;
    let finished = false;
    let raceState = 'countdown'; // 'countdown', 'racing'
    let countdownTimer = 4.0;

    onLapChange(currentLap, totalLaps);

    // 12. Imperative Loop
    let lastTime = performance.now();

    function loop(time) {
      const dt = Math.min((time - lastTime) / 1000, 0.1); // limit dt to 100ms
      lastTime = time;

      // Handle level reset (R key)
      if (keys.reset) {
        // Reset player
        kartState = initKartState(levelData);
        kartState.pos.addScaledVector(startDir, -12).addScaledVector(rightDir, -4);
        kartMesh.position.copy(kartState.pos);
        kartMesh.rotation.y = kartState.angle;
        
        // Reset race parameters
        currentLap = 1;
        nextCheckpointIndex = 0;
        elapsedTime = 0;
        finished = false;
        raceState = 'countdown';
        countdownTimer = 4.0;
        
        // Reset traffic light
        redMat1.color.setHex(0x330000);
        redMat2.color.setHex(0x330000);
        greenMat.color.setHex(0x003300);

        onLapChange(currentLap, totalLaps);

        // Reset rivals
        rivals.forEach((rival, i) => {
          const fresh = createRival(levelData, i);
          if (i === 0) fresh.pos.addScaledVector(startDir, 0).addScaledVector(rightDir, 4);
          if (i === 1) fresh.pos.addScaledVector(startDir, -4).addScaledVector(rightDir, -4);
          if (i === 2) fresh.pos.addScaledVector(startDir, -8).addScaledVector(rightDir, 4);
          
          rival.pos.copy(fresh.pos);
          rival.angle = fresh.angle;
          rival.speed = 0;
          rival.currentWaypointIdx = fresh.currentWaypointIdx;
          rival.mesh.position.copy(fresh.pos);
          rival.mesh.rotation.y = fresh.angle;
        });

        // Reset particles
        particles.forEach(p => scene.remove(p.mesh));
        particles.length = 0;
        
        resetCameraState();
        keys.reset = false;
      }

      if (!finished) {
        if (raceState === 'countdown') {
          countdownTimer -= dt;
          
          if (countdownTimer <= 3.0) redMat1.color.setHex(0xff0000);
          if (countdownTimer <= 2.0) redMat2.color.setHex(0xff0000);
          if (countdownTimer <= 1.0) greenMat.color.setHex(0x00ff00);

          if (countdownTimer <= 0) {
            raceState = 'racing';
          } else {
            keys.up = false; keys.down = false; keys.left = false; keys.right = false;
            kartState.speed = 0;
            rivals.forEach(r => r.speed = 0);
          }
        } else {
          elapsedTime += dt;
        }

        // A. Update Physics
        const steerDir = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
        updatePhysics(kartState, keys, levelData, dt);

        // B. Update Rivals AI
        if (raceState === 'racing') {
          updateRivals(rivals, kartState, levelData, dt);
        }

        // C. Update Camera
        updateCamera(camera, kartState, dt, keys);

        // D. Update Visuals
        kartMesh.position.copy(kartState.pos);
        kartMesh.rotation.y = kartState.angle;
        
        // Lean kart slightly when steering
        kartMesh.rotation.z = THREE.MathUtils.lerp(
          kartMesh.rotation.z,
          -steerDir * (kartState.isDrifting ? 0.15 : 0.08),
          10.0 * dt
        );

        updateKartVisuals(
          kartMesh,
          kartState.speed,
          steerDir,
          dt,
          kartState.boostTimer > 0
        );

        // E. Check Checkpoints
        const cpTarget = levelData.checkpoints[nextCheckpointIndex];
        const distToCP = kartState.pos.distanceTo(cpTarget);
        
        // Checkpoint radius check (width is 15-16, so distance within 12.0 is extremely safe)
        if (distToCP < 14.0) {
          nextCheckpointIndex = (nextCheckpointIndex + 1) % levelData.checkpoints.length;
          
          // Crossed Start/Finish line
          if (nextCheckpointIndex === 0) {
            if (currentLap >= totalLaps) {
              finished = true;
              onFinish(elapsedTime);
            } else {
              currentLap += 1;
              onLapChange(currentLap, totalLaps);
            }
          }
        }

        // F. Particles Emission (Visual effects)
        // Wheels positions for drift sparks & smoke
        if (kartState.isDrifting && Math.abs(kartState.speed) > 10.0) {
          // Blue/yellow drift sparks depending on drift charge
          const sparkColor = kartState.driftCharge > 0.8 ? 0xffea00 : 0x00f3ff;
          spawnParticles(kartState.pos, sparkColor, 2, 0.5);
          
          // Smoke when drifting
          if (Math.random() > 0.4) {
            spawnParticles(kartState.pos, 0x888888, 1, 0.8);
          }
        }

        // Exhaust boost fire
        if (kartState.boostTimer > 0) {
          // Cyan boost fire
          const backOffsetDir = new THREE.Vector3(-Math.sin(kartState.angle), 0.3, -Math.cos(kartState.angle));
          const flamePos = kartState.pos.clone().addScaledVector(backOffsetDir, 1.2);
          spawnParticles(flamePos, 0x00ffff, 3, 1.2);
        }

        updateParticles(dt);

        // H. Weather Animation
        if (rainSystem) {
          rainSystem.position.copy(kartState.pos); // Follow player
          
          const positions = rainSystem.geometry.attributes.position.array;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i+1] -= 80.0 * dt; // rain falls down
            if (positions[i+1] < 0) {
              positions[i+1] = 40; // reset to top
            }
          }
          rainSystem.geometry.attributes.position.needsUpdate = true;
        }

        // H2. Update Item Boxes
        itemBoxMeshes.forEach(ib => {
          if (ib.data.active) {
            ib.mesh.visible = true;
            ib.mesh.rotation.y += 2.0 * dt;
            ib.mesh.rotation.x += 1.0 * dt;
          } else {
            ib.mesh.visible = false;
          }
        });

        // H3. Dynamic Oil Slicks (from items)
        if (levelData.oilSlicks && levelData.oilSlicks.length > obstacleMeshes.filter(m => m.isSlick).length) {
          // Re-render new oil slicks (quick hack for demo, ideally we spawn them dynamically)
          levelData.oilSlicks.forEach((slick, i) => {
            if (i >= obstacleMeshes.filter(m => m.isSlick).length) {
              const slickGeom = new THREE.CircleGeometry(slick.radius, 16);
              const slickMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, transparent: true, opacity: 0.85 });
              const slickMesh = new THREE.Mesh(slickGeom, slickMat);
              slickMesh.rotation.x = -Math.PI / 2;
              slickMesh.position.set(slick.x, slick.y || 0.05, slick.z);
              slickMesh.isSlick = true;
              scene.add(slickMesh);
              obstacleMeshes.push(slickMesh);
            }
          });
        }

        // G. Update HUD elements directly in the DOM for maximum performance
        const countdownEl = document.getElementById('hud-countdown');
        if (countdownEl) {
          if (raceState === 'countdown') {
            if (countdownTimer > 3) countdownEl.textContent = '';
            else if (countdownTimer > 2) countdownEl.textContent = '3';
            else if (countdownTimer > 1) countdownEl.textContent = '2';
            else if (countdownTimer > 0) countdownEl.textContent = '1';
          } else if (countdownTimer > -1.0) {
            countdownEl.textContent = '¡YA!';
            countdownEl.style.color = '#00ff88';
            countdownTimer -= dt;
          } else {
            countdownEl.textContent = '';
          }
        }

        const lapEl = document.getElementById('hud-lap-value');
        if (lapEl) {
          lapEl.textContent = `${currentLap} / ${totalLaps}`;
        }
        
        const timeEl = document.getElementById('hud-time-value');
        if (timeEl) {
          const mins = Math.floor(elapsedTime / 60);
          const secs = Math.floor(elapsedTime % 60);
          const ms = Math.floor((elapsedTime % 1) * 100);
          timeEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        }
        
        const speedEl = document.getElementById('hud-speed-value');
        if (speedEl) {
          speedEl.textContent = Math.round(Math.abs(kartState.speed) * 3);
        }
        
        const boostBarEl = document.getElementById('hud-boost-bar');
        const boostTextEl = document.getElementById('hud-boost-text');
        if (boostBarEl && boostTextEl) {
          if (kartState.boostCooldown > 0) {
            const pct = (1.0 - (kartState.boostCooldown / 4.0)) * 100;
            boostBarEl.style.width = `${pct}%`;
            boostBarEl.style.backgroundColor = '#ffea00';
            boostTextEl.textContent = 'RECARGANDO';
            boostTextEl.style.color = '#ffea00';
          } else {
            boostBarEl.style.width = '100%';
            boostBarEl.style.backgroundColor = '#00ff88';
            boostTextEl.textContent = 'READY';
            boostTextEl.style.color = '#00ff88';
          }
        }
        
        const itemEl = document.getElementById('hud-item-value');
        if (itemEl) {
          if (kartState.currentItem === 'mushroom') itemEl.textContent = '🍄 Nitro';
          else if (kartState.currentItem === 'oil_slick') itemEl.textContent = '🛢️ Aceite';
          else itemEl.textContent = 'Vacío';
        }
      }

      // H. Render Fullscreen
      renderer.setViewport(0, 0, width, height);
      renderer.setScissor(0, 0, width, height);
      renderer.setScissorTest(false);
      renderer.clear();
      renderer.render(scene, camera);

      // I. Render Minimap
      const mapW = Math.min(width * 0.25, 200);
      const mapH = mapW;
      renderer.setViewport(width - mapW - 20, height - mapH - 20, mapW, mapH);
      renderer.setScissor(width - mapW - 20, height - mapH - 20, mapW, mapH);
      renderer.setScissorTest(true);
      renderer.clearDepth(); // clear depth so it renders on top
      
      // Update minimap camera to follow player but from high above
      minimapCamera.position.x = kartState.pos.x;
      minimapCamera.position.z = kartState.pos.z;
      
      renderer.render(scene, minimapCamera);

      animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);

    // 13. Window Resize Handler
    function handleResize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    // 14. Clean-up (Dispose Geometries and Materials to prevent leaks)
    return () => {
      cancelAnimationFrame(animationFrameId);
      cleanupInput();
      window.removeEventListener('resize', handleResize);

      // Remove particles
      particles.forEach(p => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      });

      // Dispose scene recursively
      scene.traverse(object => {
        if (!object.isMesh) return;
        
        if (object.geometry) object.geometry.dispose();

        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      renderer.dispose();
    };
  }, [levelId, onLapChange, onFinish, onSpeedChange, onBoostCooldownChange]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}

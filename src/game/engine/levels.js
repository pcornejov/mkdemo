// src/game/engine/levels.js
import * as THREE from 'three';

// Helper to interpolate points along a set of key waypoints
function generatePath(keyPoints, subdivisions = 4, smoothIterations = 3) {
  let points = [];
  
  // 1. Linear interpolation to subdivide
  for (let i = 0; i < keyPoints.length; i++) {
    const p1 = keyPoints[i];
    const p2 = keyPoints[(i + 1) % keyPoints.length];
    
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      points.push(new THREE.Vector3(
        p1.x + (p2.x - p1.x) * t,
        p1.y + (p2.y - p1.y) * t,
        p1.z + (p2.z - p1.z) * t
      ));
    }
  }

  // 2. Smooth path using a sliding average (Laplacian smoothing)
  for (let iter = 0; iter < smoothIterations; iter++) {
    const smoothed = [];
    for (let i = 0; i < points.length; i++) {
      const prev = points[(i - 1 + points.length) % points.length];
      const curr = points[i];
      const next = points[(i + 1) % points.length];
      
      smoothed.push(new THREE.Vector3(
        (prev.x + curr.x * 2 + next.x) / 4,
        (prev.y + curr.y * 2 + next.y) / 4,
        (prev.z + curr.z * 2 + next.z) / 4
      ));
    }
    points = smoothed;
  }

  return points;
}

// Generates wall boundary line segments and track mesh geometry data
export function buildTrackData(pathPoints, width, options = {}) {
  const innerWalls = [];
  const outerWalls = [];
  const vertices = [];
  const indices = [];

  const n = pathPoints.length;
  
  // Temporary vectors
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  
  const innerPts = [];
  const outerPts = [];

  // 1. Calculate boundaries
  for (let i = 0; i < n; i++) {
    const prev = pathPoints[(i - 1 + n) % n];
    const next = pathPoints[(i + 1) % n];
    const curr = pathPoints[i];

    tangent.subVectors(next, prev).normalize();
    // Normal is (-z, 0, x) to be perpendicular in XZ plane
    normal.set(-tangent.z, 0, tangent.x).normalize();

    const w = typeof width === 'function' ? width(i, n) : width;
    
    const innerPt = curr.clone().addScaledVector(normal, -w / 2);
    const outerPt = curr.clone().addScaledVector(normal, w / 2);

    innerPts.push(innerPt);
    outerPts.push(outerPt);
  }

  // 2. Build wall segments and track geometry
  for (let i = 0; i < n; i++) {
    const iNext = (i + 1) % n;

    // Add wall segments if they aren't disabled (used for forks/shortcuts)
    const skipInner = options.skipInnerWalls && options.skipInnerWalls.includes(i);
    const skipOuter = options.skipOuterWalls && options.skipOuterWalls.includes(i);

    if (!skipInner) {
      innerWalls.push({
        p1: new THREE.Vector2(innerPts[i].x, innerPts[i].z),
        p2: new THREE.Vector2(innerPts[iNext].x, innerPts[iNext].z),
        y1: innerPts[i].y,
        y2: innerPts[iNext].y
      });
    }

    if (!skipOuter) {
      outerWalls.push({
        p1: new THREE.Vector2(outerPts[i].x, outerPts[i].z),
        p2: new THREE.Vector2(outerPts[iNext].x, outerPts[iNext].z),
        y1: outerPts[i].y,
        y2: outerPts[iNext].y
      });
    }

    // Geometry vertices
    // We add inner and outer points for vertex generation
    const currInner = innerPts[i];
    const currOuter = outerPts[i];
    
    vertices.push(currInner.x, currInner.y, currInner.z);
    vertices.push(currOuter.x, currOuter.y, currOuter.z);

    // Indices for two triangles forming a quad
    const base = i * 2;
    const nextBase = iNext * 2;

    // Triangle 1: inner_curr, outer_curr, inner_next
    indices.push(base, base + 1, nextBase);
    // Triangle 2: outer_curr, outer_next, inner_next
    indices.push(base + 1, nextBase + 1, nextBase);
  }

  // Create ThreeJS BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return {
    geometry,
    innerWalls,
    outerWalls,
    innerPts,
    outerPts,
    pathPoints
  };
}

export const levels = {
  1: {
    name: "Óvalo Tutorial",
    laps: 2,
    width: 16,
    keyPoints: [
      { x: 0, y: 0, z: 35 },
      { x: 35, y: 0, z: 35 },
      { x: 55, y: 0, z: 20 },
      { x: 55, y: 0, z: -20 },
      { x: 35, y: 0, z: -35 },
      { x: 0, y: 0, z: -35 },
      { x: -35, y: 0, z: -35 },
      { x: -55, y: 0, z: -20 },
      { x: -55, y: 0, z: 20 },
      { x: -35, y: 0, z: 35 },
    ],
    obstacles: [],
    boostPads: [
      { x: 45, y: 0, z: 0, width: 8, length: 3 },
      { x: -45, y: 0, z: 0, width: 8, length: 3 }
    ],
    rivalCount: 0,
    rivalSpeed: 0,
    checkpoints: [0, 20, 40], // Indices in the smoothed path
    startPosition: { x: 0, y: 0, z: 35 },
    startRotation: -Math.PI / 2, // Facing West (towards -X)
    ambientColor: 0x888899,
    skyColor: 0x5cd6ff,        // Bright Sky Blue
    groundColor: 0x4ade80,     // Saturated Grass Green
    trackColor: 0x64748b,      // Friendly Slate Gray
    wallColor: 0xf97316        // Inflatable Toy Orange
  },
  2: {
    name: "Circuito Rampa",
    laps: 3,
    width: 15,
    keyPoints: [
      { x: 0, y: 0, z: 40 },
      { x: 35, y: 0, z: 30 },
      { x: 50, y: 0, z: 10 },
      { x: 35, y: 0, z: -10 },
      { x: 10, y: 0, z: -15 },
      { x: -10, y: 3, z: -25 },   // Ramp up
      { x: -35, y: 6, z: -35 },   // Ramp top
      { x: -55, y: 6, z: -35 },   // High curve
      { x: -70, y: 6, z: -15 },   // High curve 2
      { x: -60, y: 3, z: 10 },    // Ramp down
      { x: -40, y: 0, z: 20 },    // Back to floor
      { x: -20, y: 0, z: 15 },
      { x: -10, y: 0, z: 30 },
    ],
    obstacles: [],
    boostPads: [
      { x: 25, y: 0, z: 20, width: 6, length: 3 },
      { x: -65, y: 6, z: -25, width: 6, length: 3 }
    ],
    rivalCount: 2,
    rivalSpeed: 23, // Max speed for AI
    checkpoints: [0, 16, 32, 48],
    startPosition: { x: 0, y: 0, z: 40 },
    startRotation: -Math.PI / 2,
    ambientColor: 0x9e77f3,
    skyColor: 0xf87171,        // Pastel Sunset Red/Coral
    groundColor: 0x8b5cf6,     // Playful Violet Hills
    trackColor: 0x4c1d95,      // Deep Cartoon Purple
    wallColor: 0xfacc15        // Glowing Inflatable Yellow
  },
  3: {
    name: "Templo del Drift & Atajo (GP)",
    laps: 3,
    width: 32,
    keyPoints: [
      // Main loop (Scaled 3x)
      { x: 0, y: 0, z: 150 },
      { x: 90, y: 0, z: 150 },
      { x: 165, y: 0, z: 120 },   // Branch start (shortcut leaves here)
      { x: 225, y: 0, z: 90 },    // Outer loop starts
      { x: 270, y: 0, z: 15 },
      { x: 285, y: 0, z: -75 },
      { x: 240, y: 0, z: -165 },
      { x: 150, y: 0, z: -210 },  // Outer loop ends (shortcut merges here)
      { x: 60, y: 0, z: -225 },
      { x: -45, y: 0, z: -210 },
      { x: -135, y: 0, z: -165 },
      { x: -195, y: 0, z: -75 },
      { x: -225, y: 0, z: 15 },
      { x: -180, y: 0, z: 90 },
      { x: -90, y: 0, z: 135 },
    ],
    shortcutKeyPoints: [
      { x: 165, y: 0, z: 120 },   // Start
      { x: 156, y: 0, z: 30 },    // S-curve inside shortcut
      { x: 144, y: 0, z: -60 },
      { x: 153, y: 0, z: -150 },
      { x: 150, y: 0, z: -210 }   // End
    ],
    obstacles: [
      { x: 255, y: 0, z: 45, radius: 4.0, type: 'danger' },
      { x: 240, y: 0, z: -120, radius: 4.0, type: 'danger' },
      { x: -90, y: 0, z: -195, radius: 4.0, type: 'danger' },
      { x: -210, y: 0, z: 45, radius: 4.0, type: 'danger' },
      { x: 120, y: 0, z: 140, radius: 3.5, type: 'danger' },
      { x: -150, y: 0, z: -120, radius: 3.5, type: 'danger' }
    ],
    boostPads: [
      { x: 60, y: 0, z: 150, width: 10, length: 6 },
      { x: 150, y: 0, z: -60, width: 8, length: 6 },
      { x: -180, y: 0, z: -10, width: 10, length: 6 }
    ],
    rivalCount: 3,
    rivalSpeed: 95,
    startPosition: { x: 0, y: 0, z: 150 },
    startRotation: Math.PI / 2,
    ambientColor: 0x3b82f6,
    skyColor: 0x0f172a,
    groundColor: 0x10b981,
    trackColor: 0x334155,
    wallColor: 0x06b6d4
  }
};

// Generates track geometry, walls and path data for rendering
export function getLevelData(levelId) {
  const cfg = levels[levelId];
  if (!cfg) return null;

  // Generate primary smoothed path
  const primaryPath = generatePath(cfg.keyPoints, 8, 4); // Increased subdivisions for smoother curves on larger track
  
  if (levelId === 3) {
    // Level 3 has a shortcut! Let's build both main track and shortcut track.
    const shortcutPath = generatePath(cfg.shortcutKeyPoints, 5, 3);
    
    // We want to open the walls of the main path where the shortcut starts and ends.
    // Let's find path points closest to the shortcut start and end.
    // Shortcut start is around cfg.keyPoints[2] (55, 0, 40)
    // Shortcut end is around cfg.keyPoints[7] (50, 0, -70)
    // In the smoothed primaryPath, let's find the closest indices.
    let startIdx = 0;
    let endIdx = 0;
    let minDistStart = Infinity;
    let minDistEnd = Infinity;
    
    for (let i = 0; i < primaryPath.length; i++) {
      const dStart = primaryPath[i].distanceTo(cfg.shortcutKeyPoints[0]);
      if (dStart < minDistStart) {
        minDistStart = dStart;
        startIdx = i;
      }
      const dEnd = primaryPath[i].distanceTo(cfg.shortcutKeyPoints[cfg.shortcutKeyPoints.length - 1]);
      if (dEnd < minDistEnd) {
        minDistEnd = dEnd;
        endIdx = i;
      }
    }

    // Open outer walls of the main track at startIdx and endIdx
    // Let's say we open 3 points around them
    const skipOuterWalls = [];
    for (let offset = -2; offset <= 2; offset++) {
      skipOuterWalls.push((startIdx + offset + primaryPath.length) % primaryPath.length);
      skipOuterWalls.push((endIdx + offset + primaryPath.length) % primaryPath.length);
    }

    const mainTrack = buildTrackData(primaryPath, cfg.width, { skipOuterWalls });
    
    // For shortcut, we open its ends (start and end segments)
    const skipShortcutOuter = [0, 1, shortcutPath.length - 2, shortcutPath.length - 1];
    const skipShortcutInner = [0, 1, shortcutPath.length - 2, shortcutPath.length - 1];
    const shortcutTrack = buildTrackData(shortcutPath, 12, { // narrower
      skipOuterWalls: skipShortcutOuter,
      skipInnerWalls: skipShortcutInner
    });

    // Merge wall segments
    const allInnerWalls = [...mainTrack.innerWalls, ...shortcutTrack.innerWalls];
    const allOuterWalls = [...mainTrack.outerWalls, ...shortcutTrack.outerWalls];

    return {
      name: cfg.name,
      laps: cfg.laps,
      startPosition: cfg.startPosition,
      startRotation: cfg.startRotation,
      // We will render two meshes
      geometries: [
        { geometry: mainTrack.geometry, color: cfg.trackColor },
        { geometry: shortcutTrack.geometry, color: 0x334433 } // slightly different color for shortcut
      ],
      innerWalls: allInnerWalls,
      outerWalls: allOuterWalls,
      pathPoints: primaryPath, // rivals will follow the main path
      shortcutPathPoints: shortcutPath,
      checkpoints: Array.from({length: 8}).map((_, i) => primaryPath[Math.floor((i * primaryPath.length) / 8)]),
      obstacles: cfg.obstacles,
      boostPads: cfg.boostPads,
      rivalCount: cfg.rivalCount,
      rivalSpeed: cfg.rivalSpeed,
      ambientColor: cfg.ambientColor,
      skyColor: cfg.skyColor,
      groundColor: cfg.groundColor,
      wallColor: cfg.wallColor
    };
  } else {
    // Normal track
    const track = buildTrackData(primaryPath, cfg.width);
    return {
      name: cfg.name,
      laps: cfg.laps,
      startPosition: cfg.startPosition,
      startRotation: cfg.startRotation,
      geometries: [{ geometry: track.geometry, color: cfg.trackColor }],
      innerWalls: track.innerWalls,
      outerWalls: track.outerWalls,
      pathPoints: primaryPath,
      checkpoints: Array.from({length: 6}).map((_, i) => primaryPath[Math.floor((i * primaryPath.length) / 6)]),
      obstacles: cfg.obstacles,
      boostPads: cfg.boostPads,
      rivalCount: cfg.rivalCount,
      rivalSpeed: cfg.rivalSpeed,
      ambientColor: cfg.ambientColor,
      skyColor: cfg.skyColor,
      groundColor: cfg.groundColor,
      wallColor: cfg.wallColor
    };
  }
}

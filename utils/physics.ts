import { CarState, Rect, Point } from '../types';
import { CAR_CONFIG } from '../constants';

// --- Math Helpers ---

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const normalizeAngle = (angle: number) => {
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a;
};

// --- Physics Update ---

export const updateCarPhysics = (currentState: CarState): CarState => {
  const next = { ...currentState };

  // 1. Determine Target Velocity based on Gear and Speed Level
  let speedMagnitude = 0;
  
  if (next.gear !== 'P') {
      // Ensure level is within bounds (1-5 maps to index 0-4)
      const levelIndex = Math.max(0, Math.min(next.speedLevel - 1, CAR_CONFIG.speedLevels.length - 1));
      speedMagnitude = CAR_CONFIG.speedLevels[levelIndex];
  }

  let targetVelocity = 0;
  if (next.gear === 'D') {
    targetVelocity = speedMagnitude;
  } else if (next.gear === 'R') {
    targetVelocity = -speedMagnitude;
  } else {
    targetVelocity = 0;
  }
  
  // Instant velocity change
  next.velocity = targetVelocity;

  // 2. Determine Steering Angle from Discrete Step
  // Map step (-10 to 10) to angle (-Max to +Max)
  const anglePerStep = CAR_CONFIG.maxSteeringAngle / CAR_CONFIG.steeringSteps;
  const steeringAngle = next.steeringStep * anglePerStep;

  // 3. Kinematic Bicycle Model
  if (Math.abs(next.velocity) > 0.001) {
    const turnRadius = CAR_CONFIG.wheelbase / Math.tan(steeringAngle);
    
    // Angular velocity
    // Avoid division by zero if steering is 0
    if (Math.abs(steeringAngle) < 0.001) {
       // Linear motion
       next.x += next.velocity * Math.cos(next.heading);
       next.y += next.velocity * Math.sin(next.heading);
    } else {
       const omega = next.velocity / turnRadius;
       
       // Update position based on heading
       next.x += next.velocity * Math.cos(next.heading);
       next.y += next.velocity * Math.sin(next.heading);
       
       // Rotate heading
       next.heading += omega;
    }
  }

  return next;
};

// --- Collision Detection (SAT) ---

const rotatePoint = (p: Point, center: Point, angle: number): Point => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
};

export const getCarCorners = (car: CarState): Point[] => {
  const halfW = CAR_CONFIG.length / 2; // Length is along X axis when rotation is 0
  const halfH = CAR_CONFIG.width / 2;
  const center = { x: car.x, y: car.y };
  
  // Corners relative to center (0 rotation)
  const corners = [
    { x: center.x + halfW, y: center.y + halfH },
    { x: center.x - halfW, y: center.y + halfH },
    { x: center.x - halfW, y: center.y - halfH },
    { x: center.x + halfW, y: center.y - halfH },
  ];

  return corners.map(p => rotatePoint(p, center, car.heading));
};

export const getRectCorners = (rect: Rect): Point[] => {
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const rot = rect.rotation ? toRad(rect.rotation) : 0;

  const corners = [
    { x: center.x + halfW, y: center.y + halfH },
    { x: center.x - halfW, y: center.y + halfH },
    { x: center.x - halfW, y: center.y - halfH },
    { x: center.x + halfW, y: center.y - halfH },
  ];

  return corners.map(p => rotatePoint(p, center, rot));
};

// Separating Axis Theorem
const getAxes = (corners: Point[]): Point[] => {
  const axes: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % corners.length];
    const edge = { x: p1.x - p2.x, y: p1.y - p2.y };
    // Normal
    axes.push({ x: -edge.y, y: edge.x });
  }
  return axes;
};

const project = (corners: Point[], axis: Point) => {
  let min = Infinity;
  let max = -Infinity;
  for (const p of corners) {
    const dot = p.x * axis.x + p.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
};

const overlap = (proj1: { min: number; max: number }, proj2: { min: number; max: number }) => {
  return proj1.max >= proj2.min && proj2.max >= proj1.min;
};

export const checkCollision = (polyA: Point[], polyB: Point[]): boolean => {
  const axes = [...getAxes(polyA), ...getAxes(polyB)];
  
  for (const axis of axes) {
    const p1 = project(polyA, axis);
    const p2 = project(polyB, axis);
    if (!overlap(p1, p2)) {
      return false; // Found a separating axis
    }
  }
  return true; // No separating axis found -> collision
};

export const checkWinCondition = (car: CarState, target: Rect): boolean => {
    // 1. Car must be stopped (allow tiny threshold)
    if (Math.abs(car.velocity) > 0.1) return false;

    // 2. Get Car Corners
    const carCorners = getCarCorners(car);

    // 3. Target properties
    const targetCenter = { 
        x: target.x + target.width / 2, 
        y: target.y + target.height / 2 
    };
    
    // We want to check if ALL car corners are inside the target rectangle.
    // To handle target rotation easily, we transform car corners into the target's local coordinate space.
    // In local space, the target is an axis-aligned box centered at (0,0).
    
    const targetRad = toRad(target.rotation || 0);
    // Inverse rotation
    const cos = Math.cos(-targetRad);
    const sin = Math.sin(-targetRad);

    const halfW = target.width / 2;
    const halfH = target.height / 2;

    for (const p of carCorners) {
        // Translate point to be relative to target center
        const dx = p.x - targetCenter.x;
        const dy = p.y - targetCenter.y;

        // Rotate point by -targetRotation to align with axes
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // Check if point is inside the axis-aligned bounds
        // Using a tiny epsilon for float comparison safety isn't strictly necessary for "visual" win, 
        // but strictly < width/2 ensures it's fully inside.
        if (Math.abs(localX) > halfW || Math.abs(localY) > halfH) {
            return false;
        }
    }

    return true;
};
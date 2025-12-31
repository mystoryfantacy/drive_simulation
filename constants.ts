export const CAR_CONFIG = {
  width: 24,   // pixels (approx 1.8m)
  length: 46,  // pixels (approx 4.5m)
  wheelbase: 28, // pixels (distance between axles)
  maxSteeringAngle: Math.PI / 4, // 45 degrees
  speedLevels: [0.4, 0.7, 1.0, 1.3, 1.6], // 5 discrete speed levels (pixels/frame)
  steeringSteps: 10, // Number of discrete steps for steering (center to lock)
  visualLockTurns: 1.5, // 1.5 turns (540 degrees) for visual steering wheel
};

export const COLORS = {
  carBody: '#3B82F6', // Blue 500
  carGlass: '#93C5FD', // Blue 300
  carLights: '#EF4444', // Red 500
  wheel: '#1F2937', // Gray 800
  obstacle: '#4B5563', // Gray 600
  target: 'rgba(16, 185, 129, 0.3)', // Emerald 500 transparent
  targetOutline: '#10B981',
  asphalt: '#1F2937', // Gray 800
  collision: '#EF4444',
  steeringWheel: '#D1D5DB', // Gray 300
};

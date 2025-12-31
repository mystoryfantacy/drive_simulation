export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees
}

export interface CarState {
  x: number; // Center x
  y: number; // Center y
  heading: number; // Angle in radians (0 is right, PI/2 is down)
  steeringStep: number; // Integer: -10 to +10. 0 is center.
  velocity: number;
  speedLevel: number; // 1 to 5
  gear: 'D' | 'R' | 'P'; // Drive, Reverse, Park
}

export interface Level {
  id: number;
  name: string;
  description: string;
  start: { x: number; y: number; heading: number };
  target: Rect;
  obstacles: Rect[]; // Walls/Other cars
  bounds: { width: number; height: number };
}

export interface GameStatus {
  isPlaying: boolean;
  hasCrashed: boolean;
  hasWon: boolean;
  message: string;
}

import { Level } from '../types';

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "The Basic Box",
    description: "Get used to the controls. Park the car in the green box.",
    bounds: { width: 600, height: 400 },
    start: { x: 100, y: 200, heading: 0 },
    target: { x: 450, y: 150, width: 100, height: 100, rotation: 0 },
    obstacles: [
      { x: 0, y: 0, width: 600, height: 20, rotation: 0 }, // Top
      { x: 0, y: 380, width: 600, height: 20, rotation: 0 }, // Bottom
      { x: 0, y: 0, width: 20, height: 400, rotation: 0 }, // Left
      { x: 580, y: 0, width: 20, height: 400, rotation: 0 }, // Right
      // A simple wall in middle
      { x: 300, y: 100, width: 20, height: 200, rotation: 0 },
    ]
  },
  {
    id: 2,
    name: "The Alley Turn",
    description: "A tight L-turn. Don't scratch the paint.",
    bounds: { width: 600, height: 400 },
    start: { x: 80, y: 320, heading: 0 }, // Bottom left facing right
    target: { x: 450, y: 50, width: 80, height: 120, rotation: 0 }, // Top right
    obstacles: [
      // Outer L
      { x: 0, y: 0, width: 600, height: 20, rotation: 0 },
      { x: 580, y: 0, width: 20, height: 400, rotation: 0 },
      { x: 0, y: 380, width: 600, height: 20, rotation: 0 },
      { x: 0, y: 0, width: 20, height: 400, rotation: 0 },
      // Inner L block
      { x: 200, y: 150, width: 400, height: 250, rotation: 0 },
    ]
  },
  {
    id: 3,
    name: "Parallel Nightmare",
    description: "Parallel park between two cars.",
    bounds: { width: 600, height: 400 },
    start: { x: 100, y: 200, heading: 0 },
    target: { x: 400, y: 280, width: 120, height: 60, rotation: 0 }, // The spot
    obstacles: [
      // Curb
      { x: 0, y: 360, width: 600, height: 40, rotation: 0 },
      // Car in front
      { x: 540, y: 290, width: 50, height: 50, rotation: 0 }, 
      // Car Behind
      { x: 250, y: 290, width: 50, height: 50, rotation: 0 },
      // Other cars nearby
      { x: 400, y: 50, width: 50, height: 100, rotation: 0 },
      // Walls
      { x: 0, y: 0, width: 20, height: 400, rotation: 0 },
      { x: 580, y: 0, width: 20, height: 400, rotation: 0 },
      { x: 0, y: 0, width: 600, height: 20, rotation: 0 },
    ]
  }
];

import { Level } from '../types';

const STORAGE_KEY = 'precision_parker_custom_levels';

export const loadCustomLevels = (): Level[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load custom levels", e);
    return [];
  }
};

export const saveCustomLevels = (levels: Level[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch (e) {
    console.error("Failed to save custom levels", e);
  }
};

export const generateNextId = (levels: Level[]): number => {
  const maxId = levels.reduce((max, l) => Math.max(max, l.id), 1000); // Custom levels start from 1000 conceptually
  return maxId + 1;
};
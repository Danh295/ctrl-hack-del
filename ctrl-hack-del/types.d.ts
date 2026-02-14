// src/types.d.ts
import * as PIXI from 'pixi.js';

declare global {
  interface Window {
    PIXI: typeof PIXI;
  }
}

// Simple module declaration if the library lacks types
declare module 'pixi-live2d-display' {
  export class Live2DModel extends PIXI.Container {
    static from(path: string): Promise<Live2DModel>;
    motion(group: string, index?: number, priority?: number): void;
    expression(name: string): void;
    internalModel: any;
  }
}
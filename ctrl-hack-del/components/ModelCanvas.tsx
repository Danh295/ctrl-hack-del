"use client";
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

// Expose PIXI to window immediately
if (typeof window !== "undefined") {
  (window as any).PIXI = PIXI;
}

interface ModelCanvasProps {
  emotion: string;
  model?: string; // "arisa" or "chitose"
}

export default function ModelCanvas({ emotion, model = "arisa" }: ModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let app: PIXI.Application | null = null;

    // --- HELPER: Manually load a script tag ---
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        // 1. LOAD BOTH RUNTIMES
        await loadScript("/live2d.min.js");
        await loadScript("https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js");

        // 2. Import the library
        const { Live2DModel } = await import('pixi-live2d-display');

        // 3. Start Pixi
        app = new PIXI.Application({
          view: canvasRef.current!,
          autoStart: true,
          resizeTo: canvasRef.current!.parentElement as HTMLElement,
          transparent: true,
          antialias: true,
        });

        // 4. Load Model
        const modelPath = model === "chitose" 
          ? "/models/06chitose/chitose_t02.model3.json"
          : "/models/01arisa/arisa_t11.model3.json";
        const loadedModel = await Live2DModel.from(modelPath);

        app.stage.addChild(loadedModel as unknown as PIXI.DisplayObject);
        modelRef.current = loadedModel;

        // Scale & Position Logic
        const scaleX = (canvasRef.current!.width * 0.7) / loadedModel.width;
        const scaleY = (canvasRef.current!.height * 1.2) / loadedModel.height;
        const scale = Math.min(scaleX, scaleY);

        loadedModel.scale.set(scale);
        loadedModel.x = canvasRef.current!.width / 2;
        loadedModel.y = canvasRef.current!.height / 3 * 2;
        loadedModel.anchor.set(0.5, 0.5);

        loadedModel.motion('Idle');

      } catch (e) {
        console.error(e);
      }
    };

    init();

    return () => {
      if (app) app.destroy(true);
    };
  }, [model]); // Re-run when model changes

  // Emotion Switcher - Use actual expression file names
  useEffect(() => {
    if (modelRef.current && emotion) {
      try {
        // Map emotions to expression files based on model
        const arisaExpressions: Record<string, string> = {
          'Angry': 'Angry',
          'Sad': 'Sad',
          'Smile': 'Smile',
          'Surprised': 'Surprised',
          'Normal': 'Normal'
        };

        const chitoseExpressions: Record<string, string> = {
          'Angry': 'Angry',
          'Sad': 'Sad',
          'Smile': 'Smile',
          'Surprised': 'Surprised',
          'Normal': 'Normal',
          'Blushing': 'Blushing'
        };
        
        const expressionFiles = model === "chitose" ? chitoseExpressions : arisaExpressions;
        const expName = expressionFiles[emotion];
        
        // Only set expression if it exists in the mapping
        if (expName && modelRef.current.expression) {
          modelRef.current.expression(expName);
        }
      } catch (e) {
        console.error('Failed to set expression:', e);
      }
    }
  }, [emotion, model]);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
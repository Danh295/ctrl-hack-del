"use client";
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

// Expose PIXI to window immediately
if (typeof window !== "undefined") {
  (window as any).PIXI = PIXI;
}

interface ModelCanvasProps {
  emotion: string;
}

export default function ModelCanvas({ emotion }: ModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const [status, setStatus] = useState("INITIALIZING...");

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
        // 1. LOAD BOTH RUNTIMES (Critical Fix)
        setStatus("LOADING ENGINES...");
        
        // Load Cubism 2 (The one causing your error)
        await loadScript("/live2d.min.js");
        
        // Load Cubism 4 (The one you actually use)
        await loadScript("https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js");
        
        // Wait a tiny bit for the window globals to settle
        await new Promise(r => setTimeout(r, 100));

        // 2. NOW import the library safely
        setStatus("STARTING LIVE2D...");
        const { Live2DModel } = await import('pixi-live2d-display');

        // 3. Start Pixi
        app = new PIXI.Application({
          view: canvasRef.current!,
          autoStart: true,
          resizeTo: canvasRef.current!.parentElement as HTMLElement,
          transparent: true, // In v6, use 'transparent' instead of 'backgroundAlpha'
          antialias: true,
        });

        // 4. Load Model
        const modelPath = "/models/01arisa/arisa_t11.model3.json";
        
        // Safety Check: Does the file exist?
        // (Optional: You can remove this fetch if you are sure)
        const check = await fetch(modelPath);
        if (!check.ok) throw new Error(`Model file not found at ${modelPath}`);

        const model = await Live2DModel.from(modelPath);

        // TypeScript cast fix
        app.stage.addChild(model as unknown as PIXI.DisplayObject);
        modelRef.current = model;

        // Scale & Position Logic
        const scaleX = (canvasRef.current!.width * 0.7) / model.width;
        const scaleY = (canvasRef.current!.height * 1.2) / model.height;
        const scale = Math.min(scaleX, scaleY);

        model.scale.set(scale);
        model.x = canvasRef.current!.width / 2;
        model.y = canvasRef.current!.height / 3 * 2;
        model.anchor.set(0.5, 0.5);

        model.motion('Idle');
        setStatus(""); // Clear status text

      } catch (e) {
        console.error(e);
        setStatus("ERROR: " + (e as Error).message);
      }
    };

    init();

    return () => {
      if (app) app.destroy(true);
    };
  }, []);

  // Emotion Switcher - Use actual expression file names
  useEffect(() => {
    if (modelRef.current && emotion) {
      try {
        // Map to actual .exp3.json file names in /models/01arisa/expressions/
        const expressionFiles: Record<string, string> = {
          'Angry': 'Angry',
          'Sad': 'Sad',
          'Smile': 'Smile',
          'Surprised': 'Surprised',
          'Normal': 'Normal'
        };
        
        const expName = expressionFiles[emotion] || 'Normal';
        if (modelRef.current.expression) {
          modelRef.current.expression(expName);
        }
      } catch (e) {
        console.error('Failed to set expression:', e);
      }
    }
  }, [emotion]);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {status && (
        <div className="absolute text-cyan-400 font-mono text-sm bg-black/80 px-4 py-2 rounded border border-cyan-500/30 z-50">
          {status}
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
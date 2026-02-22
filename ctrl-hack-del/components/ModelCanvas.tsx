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
  affection?: number;
  motion?: string | null;
  audioSrc?: string | null;
}

export default function ModelCanvas({ 
  emotion, 
  model = "arisa", 
  affection = 40, 
  motion = null,
  audioSrc
}: ModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const [modelReady, setModelReady] = useState(false);
  const appRef = useRef<PIXI.Application | null>(null);

  // --- AUDIO REFS ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // NEW: Store the current mouth volume so the model can read it mid-frame
  const currentMouthOpenY = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (appRef.current) {
      appRef.current.destroy(true);
      appRef.current = null;
    }

    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
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
        await loadScript("/live2d.min.js");
        await loadScript("https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js");

        const { Live2DModel } = await import('pixi-live2d-display');

        const app = new PIXI.Application({
          view: canvasRef.current!,
          autoStart: true,
          resizeTo: canvasRef.current!.parentElement as HTMLElement,
          backgroundAlpha: 0,
          antialias: true,
        });
        appRef.current = app;

        const modelPath = model === "chitose"
          ? "/models/06chitose/chitose_t02.model3.json"
          : "/models/01arisa/arisa_t11.model3.json";
          
        const loadedModel = await Live2DModel.from(modelPath);

        app.stage.addChild(loadedModel as unknown as PIXI.DisplayObject);
        modelRef.current = loadedModel;

        const scaleX = (canvasRef.current!.width * 0.7) / loadedModel.width;
        const scaleY = (canvasRef.current!.height * 1.2) / loadedModel.height;
        const scale = Math.min(scaleX, scaleY);

        loadedModel.scale.set(scale);
        loadedModel.x = canvasRef.current!.width / 2;
        loadedModel.y = canvasRef.current!.height / 3 * 2;
        loadedModel.anchor.set(0.5, 0.5);

        loadedModel.motion('Idle');
        setModelReady(true);

        // 1. Calculate the volume 60 times a second
        app.ticker.add(() => {
          if(!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
          }
          const average = sum / dataArray.length;
  
          // Store the math result in our Ref (Sensitvity set to 5x)
          currentMouthOpenY.current = Math.min((average / 255) * 5, 1.0);
        });

        // 2. NEW: Hook directly into the Live2D Brain
        // This runs *after* the model resets its parameters, but *before* it renders
        loadedModel.internalModel.on('beforeModelUpdate', () => {
           (loadedModel.internalModel.coreModel as any).setParameterValueById(
             'ParamMouthOpenY', 
             currentMouthOpenY.current
           );
        });

      } catch (e) {
        console.error(e);
      }
    };

    init();

    return () => {
      if (appRef.current) appRef.current.destroy(true);
    };
  }, [model]); 

  // --- EMOTIONS ---
  useEffect(() => {
    if (modelRef.current && emotion && modelReady) {
      try {
        const arisaExpressions: Record<string, string> = {
          'Angry': 'Angry', 'Sad': 'Sad', 'Smile': 'Smile',
          'Surprised': 'Surprised', 'Normal': 'Normal'
        };

        const chitoseExpressions: Record<string, string> = {
          'Angry': 'Angry.exp3.json', 'Sad': 'Sad.exp3.json', 'Smile': 'Smile.exp3.json',
          'Surprised': 'Surprised.exp3.json', 'Normal': 'Normal.exp3.json',
          'Blushing': 'Blushing.exp3.json', 'Nervous': 'f01.exp3.json'
        };

        const expressionFiles = model === "chitose" ? chitoseExpressions : arisaExpressions;
        const expName = expressionFiles[emotion];

        if (expName && modelRef.current.expression) {
          modelRef.current.expression(expName);
        }
      } catch (e) {
        console.error('Failed to set expression:', e);
      }
    }
  }, [emotion, model, modelReady]);

  // --- MOTIONS ---
  useEffect(() => {
    if (!modelRef.current || !motion || !modelReady) return;
    try {
      if (model === "arisa") {
        if (motion === "tap") modelRef.current.motion('', 0);
      } else if (model === "chitose") {
        if (motion === "wave") modelRef.current.motion('Flick', 0);
        else if (motion === "pose") modelRef.current.motion('Tap', Math.random() < 0.5 ? 0 : 1);
      }
    } catch (e) {
      console.error('Failed to play motion:', e);
    }
  }, [motion, model, modelReady]);

  // --- AUDIO PROCESSING ---
  useEffect(() => {
    if (!audioSrc) return;

    if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
    if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.src = "";
    }

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = 256;
    }

    const audio = new Audio(audioSrc);
    // REMOVED audio.crossOrigin = "anonymous" to prevent browser blocking local blobs
    audioElRef.current = audio;

    const source = ctx.createMediaElementSource(audio);
    sourceNodeRef.current = source;
    source.connect(analyserRef.current);
    analyserRef.current.connect(ctx.destination);

    const playAudio = async () => {
        try {
            if (ctx.state === 'suspended') await ctx.resume();
            await audio.play();
        } catch (e) {
            console.error("Audio playback error", e);
        }
    };

    playAudio();
  }, [audioSrc]);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
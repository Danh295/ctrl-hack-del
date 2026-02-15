"use client";
import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

if (typeof window !== "undefined") {
  (window as any).PIXI = PIXI;
}

interface ModelCanvasProps {
  emotion: string;
  model: string;
  audioSrc?: string | null;
}

export default function ModelCanvas({ emotion, model: modelName, audioSrc }: ModelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  
  const [status, setStatus] = useState("INITIALIZING...");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        setStatus("LOADING ENGINES...");
        await loadScript("/live2d.min.js"); 
        await loadScript("https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js");
        
        await new Promise(r => setTimeout(r, 100));

        setStatus("LOADING PIXI BRIDGE...");
        const { Live2DModel } = await import('pixi-live2d-display');

        setStatus("STARTING RENDERER...");
        const app = new PIXI.Application({
          view: canvasRef.current!,
          autoStart: true,
          resizeTo: canvasRef.current!.parentElement as HTMLElement,
          backgroundAlpha: 0,
        });
        appRef.current = app;

        // 4. Load Model
        const modelPath = model === "chitose" 
          ? "/models/06chitose/chitose_t02.model3.json"
          : "/models/01arisa/arisa_t11.model3.json";
        const loadedModel = await Live2DModel.from(modelPath);

        const model = await Live2DModel.from(modelPath);

        app.stage.addChild(model as unknown as PIXI.DisplayObject);
        modelRef.current = model;

        const scaleX = (canvasRef.current!.width * 0.45) / model.width;
        const scaleY = (canvasRef.current!.height * 0.85) / model.height;
        const scale = Math.min(scaleX, scaleY);
        model.scale.set(scale);
        model.x = canvasRef.current!.width / 2;
        model.y = canvasRef.current!.height / 2;
        model.anchor.set(0.5, 0.5);

        app.ticker.add(() => {
            if (!modelRef.current || !analyserRef.current) return;
    
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
    
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
    
            const mouthValue = Math.min((average / 255) * 5, 1.0);
    
            const core = modelRef.current.internalModel.coreModel;
            core.setParameterValueById('ParamMouthOpenY', mouthValue);
            core.setParameterValueById('ParamMouthOpen', mouthValue);
        });

        setStatus(""); 
      } catch (e) {
        setStatus("ERROR");
      }
    };

    init();

    return () => {
      if (appRef.current) appRef.current.destroy(true);
    };
  }, [modelName]);

  useEffect(() => {
    if (modelRef.current && emotion) {
      const expressionMap: Record<string, string> = {
        'Happy': 'f01', 'Smile': 'f01',
        'Angry': 'f03', 'Sad': 'f04',
        'Surprised': 'f02', 'Normal': 'f00',
        'Shy': 'f02'
      };
      const expId = expressionMap[emotion] || 'f01';
      if (modelRef.current.expression) {
        modelRef.current.expression(expId);
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
  }, [emotion]);

  useEffect(() => {
    if (!audioSrc) return;

    if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
    }
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
    audio.crossOrigin = "anonymous";
    audioElRef.current = audio;

    const source = ctx.createMediaElementSource(audio);
    sourceNodeRef.current = source;
    source.connect(analyserRef.current);
    analyserRef.current.connect(ctx.destination);

    const playAudio = async () => {
        try {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            await audio.play();
        } catch (e) {
            // Audio play failed
        }
    };

    playAudio();

  }, [audioSrc]);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {status && (
        <div className="absolute text-cyan-400 font-mono text-xs bg-black/80 px-2 py-1 rounded z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {status}
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
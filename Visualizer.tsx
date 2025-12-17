import React, { useEffect, useRef } from 'react';
import { AudioVisualizerProps } from '../types';

export const Visualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration
    const barWidth = 4;
    const gap = 2;
    const barColor = 'rgb(251, 191, 36)'; // amber-400
    const idleOpacity = 0.2;
    
    // Data buffer
    let dataArray: Uint8Array;
    let bufferLength = 0;

    if (analyser) {
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const render = () => {
      // Handle canvas resizing logic if needed, currently fixed/flex via CSS
      // We assume canvas.width is set by the browser layout or fixed attributes
      // To get sharp rendering on high DPI:
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Update canvas size if it changed
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      const w = canvas.width;
      const h = canvas.height;
      
      ctx.clearRect(0, 0, w, h);
      
      // Draw Logic
      if (isPlaying && analyser) {
        analyser.getByteFrequencyData(dataArray);
        
        // We want to draw a symmetric visualizer or just a nice centered one
        // Let's do a centered symmetric look for elegance
        
        const totalBarWidth = (barWidth * dpr) + (gap * dpr);
        
        // Use a subset of data (low frequencies)
        const usefulData = dataArray.slice(0, 24); // Focus on voice range
        const centerX = w / 2;
        
        usefulData.forEach((val, index) => {
            const height = Math.max(4 * dpr, (val / 255) * h * 0.8);
            const xOffset = (index * totalBarWidth);
            
            ctx.fillStyle = barColor;
            ctx.globalAlpha = 0.8;
            
            // Right bar
            ctx.beginPath();
            ctx.roundRect(centerX + xOffset + (gap*dpr)/2, (h - height) / 2, barWidth * dpr, height, 4 * dpr);
            ctx.fill();

            // Left bar (mirrored)
            if (index > 0) {
                ctx.beginPath();
                ctx.roundRect(centerX - xOffset - (gap*dpr)/2 - (barWidth*dpr), (h - height) / 2, barWidth * dpr, height, 4 * dpr);
                ctx.fill();
            }
        });

      } else {
        // Idle Animation (Breathing dots/lines)
        const time = Date.now() / 1000;
        const count = 12;
        const totalW = count * (barWidth + gap) * dpr;
        const startX = (w - totalW) / 2;
        
        ctx.fillStyle = barColor;
        
        for(let i=0; i<count; i++) {
            const offset = i * 0.5;
            const alpha = 0.1 + (Math.sin(time * 2 + offset) + 1) * 0.15; // 0.1 to 0.4
            ctx.globalAlpha = alpha * idleOpacity;
            const h_idle = 8 * dpr;
            
            ctx.beginPath();
            ctx.roundRect(startX + (i * (barWidth+gap)*dpr), (h - h_idle) / 2, barWidth*dpr, h_idle, 4*dpr);
            ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, analyser]);

  return (
    <div className="w-full max-w-[300px] h-24 mx-auto opacity-90">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
      />
    </div>
  );
};
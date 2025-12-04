import React, { useRef, useState, useEffect, useMemo } from 'react';
import { GameState, VIEWPORT_WIDTH, VIEWPORT_HEIGHT, PlaneStatus } from '../types';
import { Plane as PlaneIcon, Cloud, Trees, Factory, Building, Building2, Anchor, Ship, Car } from 'lucide-react';

interface WorldMapProps {
  gameState: GameState;
  onPlaneClick: (id: string) => void;
}

const WorldMap: React.FC<WorldMapProps> = ({ gameState, onPlaneClick }) => {
  const [scale, setScale] = useState(0.5); 
  const [pan, setPan] = useState({ x: -400, y: -300 }); 
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current) {
            setContainerSize({
                w: containerRef.current.clientWidth,
                h: containerRef.current.clientHeight
            });
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update Scale and Pan on resize to ensure bounds
  useEffect(() => {
    if (containerSize.w > 0) {
        // Enforce min scale based on container size to prevent seeing void
        const minScaleW = containerSize.w / VIEWPORT_WIDTH;
        const minScaleH = containerSize.h / VIEWPORT_HEIGHT;
        const newMin = Math.max(minScaleW, minScaleH, 0.3); // Absolute min 0.3 or strict fit
        if (scale < newMin) setScale(newMin);
    }
  }, [containerSize, scale]);

  // Traffic Sim
  const [traffic, setTraffic] = useState<{id:number, x:number, y:number, speed: number}[]>([]);
  useEffect(() => {
      const initialTraffic = Array.from({length: 15}).map((_, i) => ({
          id: i,
          x: Math.random() * 3000 - 500,
          y: 680 + (i % 2) * 12,
          speed: 2 + Math.random()
      }));
      setTraffic(initialTraffic);
      const interval = setInterval(() => {
          setTraffic(prev => prev.map(car => ({
              ...car,
              x: car.x > 3000 ? -500 : car.x + car.speed
          })));
      }, 50);
      return () => clearInterval(interval);
  }, []);

  // Stable City Generation
  const cityBuildings = useMemo(() => {
    return Array.from({length: 48}).map((_, i) => ({
        id: i,
        colSpan: Math.random() > 0.7 ? 'col-span-2' : 'col-span-1',
        height: Math.floor(Math.random() * 100) + 40,
        color: Math.random() > 0.6 ? 'bg-slate-400' : 'bg-slate-500',
        windowLit: Math.random() > 0.8
    }));
  }, []);

  // Strict Pan Limits
  const updatePan = (dx: number, dy: number) => {
    setPan(prev => {
        const newX = prev.x + dx;
        const newY = prev.y + dy;
        
        // Calculate bounds
        // Viewport Width = VIEWPORT_WIDTH * scale
        // Visible container = containerSize.w
        // Min X (Left side visible) = containerSize.w - (VIEWPORT_WIDTH * scale)
        // Max X (Right side visible) = 0
        
        const scaledW = VIEWPORT_WIDTH * scale;
        const scaledH = VIEWPORT_HEIGHT * scale;
        
        const minX = containerSize.w - scaledW;
        const maxX = 0;
        const minY = containerSize.h - scaledH;
        const maxY = 0;

        return { 
            // Allow slight bounce (20px) but snap back ideally (here just hard clamp)
            x: Math.min(Math.max(newX, minX), maxX),
            y: Math.min(Math.max(newY, minY), maxY)
        };
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    updatePan(dx, dy);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { isDragging.current = false; };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastMouse.current.x;
    const dy = e.touches[0].clientY - lastMouse.current.y;
    updatePan(dx, dy);
    lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = () => {
    isDragging.current = false;
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    const minScaleW = containerSize.w / VIEWPORT_WIDTH;
    const minScaleH = containerSize.h / VIEWPORT_HEIGHT;
    const absMin = Math.max(minScaleW, minScaleH, 0.3);

    const newScale = Math.min(Math.max(scale - e.deltaY * 0.001, absMin), 1.5);
    setScale(newScale);
    
    // Auto-adjust pan to keep within bounds if we zoom out too much
    // Simple way: re-run updatePan with 0 delta to clamp
    setPan(prev => {
        const scaledW = VIEWPORT_WIDTH * newScale;
        const scaledH = VIEWPORT_HEIGHT * newScale;
        const minX = containerSize.w - scaledW;
        const minY = containerSize.h - scaledH;
        return {
            x: Math.min(Math.max(prev.x, minX), 0),
            y: Math.min(Math.max(prev.y, minY), 0)
        };
    });
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-[#1e293b] overflow-hidden relative cursor-move select-none touch-none"
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div 
        style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            position: 'absolute'
        }}
        className="will-change-transform shadow-2xl"
      >
        {/* --- WORLD BASE --- */}
        <div className="absolute inset-0 bg-[#ecfccb]" /> 
        
        {/* Ocean - Left - Retracted to avoid Runway overlap */}
        <div className="absolute top-0 bottom-0 left-[0] width-[350px] bg-blue-500" 
             style={{ width: 350, clipPath: 'polygon(0 0, 100% 0, 90% 20%, 95% 40%, 85% 60%, 92% 80%, 100% 100%, 0 100%)' }}>
            <div className="absolute top-1/4 right-20 opacity-50"><Ship size={48} className="text-white"/></div>
        </div>
        
        {/* Beach */}
        <div className="absolute top-0 bottom-0 left-[320px] w-20 bg-[#fde68a] opacity-80" 
             style={{ clipPath: 'polygon(0 0, 100% 0, 90% 20%, 95% 40%, 85% 60%, 92% 80%, 100% 100%, 0 100%)' }} />

        {/* --- CITY & ENVIRONMENT --- */}
        
        {/* Dense City - North East - STABLE */}
        <div className="absolute top-[100px] right-[200px] w-[800px] h-[500px] opacity-90 grid grid-cols-12 gap-2 content-end">
            {cityBuildings.map((b) => (
                <div 
                    key={b.id} 
                    className={`${b.colSpan} ${b.color} rounded-sm shadow-sm flex items-end justify-center`}
                    style={{ height: b.height }}
                >
                    <div className={`w-[80%] h-[80%] bg-slate-300/30 ${b.windowLit ? 'bg-yellow-200/20' : ''}`} />
                </div>
            ))}
        </div>

        {/* Industrial Area - South West */}
        <div className="absolute bottom-[200px] left-[650px] flex flex-wrap w-[400px] gap-4">
             <div className="w-32 h-24 bg-stone-600 rounded flex items-center justify-center border-b-4 border-stone-800"><Factory className="text-stone-300" /></div>
             <div className="w-40 h-32 bg-stone-500 rounded flex items-center justify-center border-b-4 border-stone-700"><Factory className="text-stone-200" size={40} /></div>
             <div className="w-20 h-20 rounded-full bg-slate-300 border-4 border-slate-400" />
        </div>

        {/* Forest - South East */}
        <div className="absolute bottom-[100px] right-[200px] text-green-800 opacity-80">
            <div className="flex gap-4"><Trees size={120} /><Trees size={90} /><Trees size={100} /></div>
            <div className="flex gap-8 ml-20"><Trees size={80} /><Trees size={110} /></div>
        </div>

        {/* --- AIRPORT GROUNDS --- */}
        
        {/* Highway */}
        <div className="absolute bg-slate-700 h-10 w-[3000px] left-[-200px] top-[670px] shadow-md overflow-hidden z-10">
             <div className="absolute w-full top-1/2 border-t-2 border-dashed border-yellow-500 opacity-60" />
        </div>
        {/* Cars */}
        {traffic.map(car => (
            <div key={car.id} className="absolute w-5 h-3 bg-red-500 rounded-sm shadow-sm z-20" style={{ left: car.x, top: car.y }} />
        ))}

        {/* Airport Concrete Base */}
        <div className="absolute bg-[#e2e8f0] rounded-3xl" style={{ left: 450, top: 720, width: 1400, height: 450 }} />

        {/* Runway 09/27 - Shifted Right */}
        <div className="absolute h-20 bg-[#334155] flex items-center justify-between px-8 text-white font-mono font-bold text-3xl shadow-lg border-2 border-slate-600 z-10"
             style={{ left: 500, top: 740, width: 1200, borderRadius: 6 }}>
            <span>09</span>
            <div className="flex gap-32 opacity-60">
                <div className="w-24 h-3 bg-white"></div>
                <div className="w-24 h-3 bg-white"></div>
                <div className="w-24 h-3 bg-white"></div>
            </div>
            <span>27</span>
        </div>

        {/* Taxiway Network */}
        {/* Main Parallel Alpha */}
        <div className="absolute bg-[#94a3b8] h-8 border-y-2 border-yellow-400 border-opacity-50" style={{ left: 500, top: 846, width: 1200 }} /> 
        
        {/* Connectors */}
        <div className="absolute bg-[#94a3b8] w-8 h-[100px]" style={{ left: 500, top: 750 }} /> {/* West Entry */}
        <div className="absolute bg-[#94a3b8] w-8 h-[100px]" style={{ left: 1300, top: 750 }} /> {/* Rapid Exit */}
        
        {/* Apron */}
        <div className="absolute bg-[#cbd5e1] rounded-xl border border-slate-400" style={{ left: 750, top: 880, width: 750, height: 150 }} />

        {/* Terminal Building */}
        <div className="absolute bg-sky-900 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-white font-bold z-20"
             style={{ left: 800, top: 980, width: 650, height: 100 }}>
             <div className="text-2xl tracking-[0.2em] text-sky-200">SKY HARBOR</div>
             <div className="text-xs text-sky-400">INTERNATIONAL</div>
        </div>
        
        {/* Gates (Jetways) */}
        {[800, 1000, 1200, 1400].map((x, i) => (
            <div key={i} className="absolute flex flex-col items-center z-10" style={{ left: x, top: 900 }}>
                <div className="w-4 h-20 bg-slate-300 border border-slate-500 shadow-lg origin-bottom -rotate-12" />
                <div className="w-12 h-8 bg-slate-400/50 mt-1 rounded-full text-[10px] flex items-center justify-center font-bold text-slate-600">
                    G{i+1}
                </div>
            </div>
        ))}

        {/* Tower */}
        <div className="absolute flex flex-col items-center z-30" style={{ left: 600, top: 900 }}>
             <div className="w-14 h-14 bg-slate-100 rounded-lg border-2 border-slate-400 shadow-2xl flex items-center justify-center relative">
                 <div className="w-12 h-12 bg-blue-900/80 rounded animate-pulse" />
                 <div className="absolute -top-4 w-1 h-6 bg-red-500 animate-ping" />
             </div>
             <div className="w-6 h-32 bg-slate-500 bg-gradient-to-b from-slate-400 to-slate-600" />
        </div>

        {/* --- PLANES --- */}
        {gameState.planes.map(plane => (
          <div
            key={plane.id}
            onClick={(e) => { e.stopPropagation(); onPlaneClick(plane.id); }}
            onTouchEnd={(e) => { e.stopPropagation(); onPlaneClick(plane.id); }}
            className={`absolute transition-all duration-100 ease-linear cursor-pointer group 
                ${gameState.selectedPlaneId === plane.id ? 'z-[60]' : 'z-40'}
                ${plane.status === PlaneStatus.TAKEOFF ? 'animate-pulse' : ''}
            `}
            style={{
              left: plane.position.x,
              top: plane.position.y,
              transform: `translate(-50%, -50%) rotate(${plane.position.heading}deg)`
            }}
          >
            <div className={`relative transition-transform duration-300 ${gameState.selectedPlaneId === plane.id ? 'scale-150' : ''}`}>
                <PlaneIcon 
                    size={plane.type === 'widebody' ? 64 : 48} 
                    className="text-black opacity-30 absolute top-4 left-4 blur-sm transform scale-y-75"
                />
                <PlaneIcon 
                    size={plane.type === 'widebody' ? 64 : 48} 
                    fill={gameState.selectedPlaneId === plane.id ? '#ef4444' : plane.type === 'widebody' ? '#3b82f6' : plane.type === 'narrowbody' ? '#10b981' : '#f59e0b'}
                    className="text-white drop-shadow-2xl"
                    strokeWidth={1.5}
                />
                
                {/* Labels */}
                <div 
                    className={`absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap 
                        ${gameState.selectedPlaneId === plane.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity pointer-events-none z-50`}
                    style={{ transform: `rotate(${-plane.position.heading}deg)` }} 
                >
                    <div className="font-bold text-yellow-400">{plane.flightNumber}</div>
                    <div className="text-[8px] text-gray-300">{plane.status}</div>
                </div>
            </div>
          </div>
        ))}

        {/* Weather FX */}
        {gameState.weather !== 'Sunny' && (
            <div className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-40 bg-slate-600 z-[70]" />
        )}
        {gameState.weather === 'Rainy' && (
             <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-30 z-[70]" />
        )}
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-2 md:bottom-4 md:right-4 pointer-events-auto z-[80]">
        <button onClick={() => setScale(s => Math.min(s + 0.1, 1.5))} className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-gray-100 text-xl font-bold w-12 h-12 flex items-center justify-center">+</button>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.3))} className="bg-white/90 p-3 rounded-full shadow-lg hover:bg-gray-100 text-xl font-bold w-12 h-12 flex items-center justify-center">-</button>
      </div>
    </div>
  );
};

export default WorldMap;

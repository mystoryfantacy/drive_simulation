import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, ArrowLeft, ArrowRight, Zap, Minus, Pencil, Play, Trash2 } from 'lucide-react';
import { CarState, Level, GameStatus } from './types';
import { LEVELS } from './game/levels';
import { CAR_CONFIG, COLORS } from './constants';
import { updateCarPhysics, getCarCorners, getRectCorners, checkCollision, checkWinCondition, toRad } from './utils/physics';
import { loadCustomLevels, saveCustomLevels, generateNextId } from './utils/storage';
import { AICoach } from './components/AICoach';
import { SteeringWheel } from './components/SteeringWheel';
import { EditorPanel } from './components/EditorPanel';

// Initial Car State
const getInitialState = (level: Level): CarState => ({
  x: level.start.x,
  y: level.start.y,
  heading: toRad(level.start.heading),
  steeringStep: 0,
  velocity: 0,
  speedLevel: 1, // Default speed level 1 (slowest)
  gear: 'P',
});

const App: React.FC = () => {
  const [customLevels, setCustomLevels] = useState<Level[]>([]);
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [level, setLevel] = useState<Level>(LEVELS[0]);
  const [car, setCar] = useState<CarState>(getInitialState(LEVELS[0]));
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    isPlaying: false,
    hasCrashed: false,
    hasWon: false,
    message: "Ready to Start",
  });

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [selectedObjIndex, setSelectedObjIndex] = useState<number | null>(null); // -1: Target, -2: Start, >=0: Obstacle
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const requestRef = useRef<number>(0);
  const carRef = useRef<CarState>(getInitialState(LEVELS[0]));
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load custom levels on mount
  useEffect(() => {
    const loaded = loadCustomLevels();
    setCustomLevels(loaded);
  }, []);

  useEffect(() => {
    // Determine source array (Built-in or Custom)
    const allLevels = [...LEVELS, ...customLevels];
    const l = allLevels.find(l => l.id === currentLevelId) || LEVELS[0];
    setLevel(l);
    resetLevel(l);
  }, [currentLevelId, customLevels]);

  const resetLevel = (l: Level) => {
    const initial = getInitialState(l);
    setCar(initial);
    carRef.current = initial;
    setGameStatus({
      isPlaying: false,
      hasCrashed: false,
      hasWon: false,
      message: "Ready",
    });
  };

  // --- Input Handlers (Game Mode) ---

  const changeGear = (newGear: 'D' | 'R' | 'P') => {
    carRef.current.gear = newGear;
    if (newGear !== 'P') {
        carRef.current.speedLevel = 1;
        setGameStatus(p => ({ ...p, isPlaying: true }));
    }
    setCar({ ...carRef.current });
  };

  const adjustSpeed = (delta: number) => {
    const newLevel = Math.max(1, Math.min(5, carRef.current.speedLevel + delta));
    carRef.current.speedLevel = newLevel;
    setCar({ ...carRef.current });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isEditing) return; // Disable game controls in edit mode
    if (gameStatus.hasCrashed || gameStatus.hasWon) return;

    const current = carRef.current;
    
    switch (e.key) {
      case 'ArrowLeft':
        if (current.steeringStep > -CAR_CONFIG.steeringSteps) {
            carRef.current.steeringStep -= 1;
        }
        break;
      case 'ArrowRight':
        if (current.steeringStep < CAR_CONFIG.steeringSteps) {
            carRef.current.steeringStep += 1;
        }
        break;
      case 'ArrowUp':
        if (current.gear !== 'P') {
            changeGear('P');
        } else {
            changeGear('D');
        }
        break;
      case 'ArrowDown':
        if (current.gear !== 'P') {
            changeGear('P');
        } else {
            changeGear('R');
        }
        break;
      case 'p':
      case 'P':
        changeGear('P');
        break;
      case '+':
      case '=':
        adjustSpeed(1);
        break;
      case '-':
      case '_':
        adjustSpeed(-1);
        break;
    }
    setCar({ ...carRef.current });
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStatus, isEditing]);

  // --- Game Loop ---
  const animate = () => {
    if (!isEditing && gameStatus.isPlaying && !gameStatus.hasCrashed && !gameStatus.hasWon) {
      const nextState = updateCarPhysics(carRef.current);
      carRef.current = nextState;
      setCar({ ...nextState }); 

      const carPoly = getCarCorners(nextState);
      
      let crashed = false;
      if (nextState.x < 0 || nextState.x > level.bounds.width || nextState.y < 0 || nextState.y > level.bounds.height) {
        crashed = true;
      }

      if (!crashed) {
        for (const obs of level.obstacles) {
          const obsPoly = getRectCorners(obs);
          if (checkCollision(carPoly, obsPoly)) {
            crashed = true;
            break;
          }
        }
      }

      if (crashed) {
        setGameStatus(prev => ({ ...prev, hasCrashed: true, message: "CRASH!" }));
      } else {
        if (checkWinCondition(nextState, level.target)) {
           setGameStatus(prev => ({ ...prev, hasWon: true, message: "PARKED!" }));
        }
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameStatus, isEditing]);


  // --- Editor Logic ---

  const toggleEditor = () => {
    if (isEditing) {
        // Exit Editor
        setIsEditing(false);
        resetLevel(level); // Reset to ensure clean state
    } else {
        // Enter Editor
        setIsEditing(true);
        setGameStatus({ ...gameStatus, isPlaying: false });
        // If it's a built-in level, clone it to a new custom level draft
        if (!level.type || level.type === 'default') {
            const newId = generateNextId(customLevels);
            const draftLevel: Level = {
                ...level,
                id: newId,
                name: `${level.name} (Remix)`,
                type: 'custom',
            };
            // Note: We don't save yet, just set state
            setLevel(draftLevel);
            setCurrentLevelId(newId);
        }
    }
  };

  const saveCurrentLevel = () => {
    if (level.type !== 'custom') return;
    
    const existingIndex = customLevels.findIndex(l => l.id === level.id);
    let newLevels = [...customLevels];
    
    if (existingIndex >= 0) {
        newLevels[existingIndex] = level;
    } else {
        newLevels.push(level);
    }
    
    setCustomLevels(newLevels);
    saveCustomLevels(newLevels);
    alert("Level Saved!");
  };

  const deleteCurrentLevel = () => {
      if (level.type !== 'default' && confirm("Delete this custom level?")) {
          const newLevels = customLevels.filter(l => l.id !== level.id);
          setCustomLevels(newLevels);
          saveCustomLevels(newLevels);
          setCurrentLevelId(LEVELS[0].id);
          setIsEditing(false);
      }
  };

  // Mouse Handlers for Editor
  const getMousePos = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.preventDefault();
    const pos = getMousePos(e);

    // Check Start
    const startDist = Math.sqrt(Math.pow(pos.x - level.start.x, 2) + Math.pow(pos.y - level.start.y, 2));
    if (startDist < 20) {
        setSelectedObjIndex(-2);
        setIsDragging(true);
        dragOffsetRef.current = { x: 0, y: 0 };
        return;
    }

    // Check Target (Center)
    // const targetCenter = { x: level.target.x + level.target.width/2, y: level.target.y + level.target.height/2 };
    if (pos.x > level.target.x && pos.x < level.target.x + level.target.width &&
        pos.y > level.target.y && pos.y < level.target.y + level.target.height) {
        setSelectedObjIndex(-1);
        setIsDragging(true);
        dragOffsetRef.current = { x: pos.x - level.target.x, y: pos.y - level.target.y };
        return;
    }

    // Check Obstacles
    // Simple check: iterate reverse to select top-most
    for (let i = level.obstacles.length - 1; i >= 0; i--) {
        const obs = level.obstacles[i];
        // Only checking bounding box (ignoring rotation for selection hit test for simplicity)
        if (pos.x >= obs.x && pos.x <= obs.x + obs.width &&
            pos.y >= obs.y && pos.y <= obs.y + obs.height) {
            setSelectedObjIndex(i);
            setIsDragging(true);
            dragOffsetRef.current = { x: pos.x - obs.x, y: pos.y - obs.y };
            return;
        }
    }

    // Deselect if clicked empty space
    setSelectedObjIndex(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditing || !isDragging || selectedObjIndex === null) return;
    const pos = getMousePos(e);

    const newLevel = { ...level };

    if (selectedObjIndex === -2) {
        // Moving Start
        newLevel.start.x = pos.x;
        newLevel.start.y = pos.y;
        // Update car preview immediately
        setCar({ ...car, x: pos.x, y: pos.y });
    } else if (selectedObjIndex === -1) {
        // Moving Target
        newLevel.target.x = pos.x - dragOffsetRef.current.x;
        newLevel.target.y = pos.y - dragOffsetRef.current.y;
    } else {
        // Moving Obstacle
        const obs = [...newLevel.obstacles];
        obs[selectedObjIndex].x = pos.x - dragOffsetRef.current.x;
        obs[selectedObjIndex].y = pos.y - dragOffsetRef.current.y;
        newLevel.obstacles = obs;
    }

    setLevel(newLevel);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };


  // --- Render Helpers ---

  const carStyle = {
    transform: `translate(${car.x}px, ${car.y}px) rotate(${car.heading}rad)`,
    width: `${CAR_CONFIG.length}px`,
    height: `${CAR_CONFIG.width}px`,
    marginLeft: `-${CAR_CONFIG.length / 2}px`,
    marginTop: `-${CAR_CONFIG.width / 2}px`,
  };

  const wheelStyle = (isFront: boolean, isLeft: boolean) => {
      const xOffset = isFront ? CAR_CONFIG.wheelbase/2 : -CAR_CONFIG.wheelbase/2;
      const yOffset = isLeft ? -CAR_CONFIG.width/2 + 2 : CAR_CONFIG.width/2 - 2;
      const anglePerStep = CAR_CONFIG.maxSteeringAngle / CAR_CONFIG.steeringSteps;
      const rot = isFront ? car.steeringStep * anglePerStep : 0;
      
      return {
          position: 'absolute' as const,
          left: '50%',
          top: '50%',
          width: '10px',
          height: '4px',
          backgroundColor: COLORS.wheel,
          borderRadius: '2px',
          transform: `translate(${xOffset - 5}px, ${yOffset - 2}px) rotate(${rot}rad)`,
      };
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-900 flex flex-col font-sans select-none text-gray-200">
      
      {/* Header */}
      <div className="flex-none h-12 flex items-center justify-between px-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-white">Precision<span className="text-blue-500">Parker</span></h1>
          {isEditing && <span className="bg-yellow-600 text-black text-[10px] font-bold px-2 py-0.5 rounded">EDITOR MODE</span>}
        </div>
        <div className="flex gap-2 items-center">
            {/* Level Selector */}
           <select 
             className="bg-gray-700 text-xs text-white border-gray-600 rounded px-2 py-1 outline-none max-w-[150px]"
             value={currentLevelId}
             onChange={(e) => {
                 setIsEditing(false); // Auto exit edit mode on switch
                 setCurrentLevelId(Number(e.target.value));
             }}
           >
             <optgroup label="Official Levels">
                {LEVELS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
             </optgroup>
             {customLevels.length > 0 && (
                 <optgroup label="My Levels">
                    {customLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                 </optgroup>
             )}
           </select>

           {/* Editor Toggle */}
           <button
             onClick={toggleEditor}
             className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-colors ${isEditing ? 'bg-yellow-500 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}
             title={isEditing ? "Play Level" : "Edit Level"}
           >
               {isEditing ? <Play size={14} /> : <Pencil size={14} />}
               {isEditing ? "PLAY" : "EDIT"}
           </button>

           {/* Restart Button (Only in Play mode) */}
           {!isEditing && (
            <button 
                onClick={() => resetLevel(level)} 
                className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition"
                title="Restart"
                >
                <RotateCcw size={16} />
            </button>
           )}

           {isEditing && level.type === 'custom' && (
               <button 
                onClick={deleteCurrentLevel}
                className="p-1 bg-red-900 hover:bg-red-800 rounded text-red-200 transition"
                title="Delete Level"
               >
                   <Trash2 size={16} />
               </button>
           )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-2 gap-4">
          
          {/* Game Canvas */}
          <div 
            ref={canvasRef}
            className={`relative bg-gray-800 border-4 rounded-lg shadow-2xl flex-shrink-0 cursor-crosshair`}
            style={{ 
                borderColor: isEditing ? '#eab308' : '#374151',
                cursor: isEditing ? 'grab' : 'default'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Status Overlay (Only in Play Mode) */}
            {!isEditing && (gameStatus.hasCrashed || gameStatus.hasWon || !gameStatus.isPlaying) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded">
                    <h2 className={`text-3xl font-bold mb-2 ${gameStatus.hasWon ? 'text-green-400' : gameStatus.hasCrashed ? 'text-red-500' : 'text-white'}`}>
                      {gameStatus.message}
                    </h2>
                    {!gameStatus.isPlaying && !gameStatus.hasCrashed && !gameStatus.hasWon && (
                        <div className="text-gray-300 text-sm animate-pulse">Press Arrow Up to Drive</div>
                    )}
                    {(gameStatus.hasCrashed || gameStatus.hasWon) && (
                        <button 
                        onClick={() => resetLevel(level)}
                        className="flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-200 px-4 py-1.5 rounded-full font-bold text-sm transition"
                        >
                        <RotateCcw size={14} /> Retry
                        </button>
                    )}
                </div>
            )}

            {!isEditing && <AICoach carState={car} level={level} hasCrashed={gameStatus.hasCrashed} />}

            <div 
            className="relative overflow-hidden bg-gray-900 rounded"
            style={{ width: level.bounds.width, height: level.bounds.height, backgroundColor: COLORS.asphalt }}
            >
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            {/* Target Area */}
            <div 
                className={`absolute border-2 border-dashed flex items-center justify-center ${isEditing && selectedObjIndex === -1 ? 'ring-2 ring-yellow-400' : ''}`}
                style={{
                left: level.target.x,
                top: level.target.y,
                width: level.target.width,
                height: level.target.height,
                borderColor: COLORS.targetOutline,
                backgroundColor: COLORS.target,
                transform: `rotate(${level.target.rotation || 0}deg)`
                }}
            >
                <div className="text-emerald-400 opacity-50 font-bold tracking-widest text-[10px] uppercase">Park</div>
            </div>

            {/* Obstacles */}
            {level.obstacles.map((obs, idx) => (
                <div 
                key={idx}
                className={`absolute bg-gray-700 border border-gray-600 ${isEditing && selectedObjIndex === idx ? 'ring-2 ring-yellow-400 z-10' : ''}`}
                style={{
                    left: obs.x,
                    top: obs.y,
                    width: obs.width,
                    height: obs.height,
                    transform: `rotate(${obs.rotation || 0}deg)`
                }}
                />
            ))}

            {/* Car (Start Position Indicator in Edit Mode) */}
            <div 
                className={`absolute shadow-lg z-0 transition-opacity duration-75 ${gameStatus.hasCrashed ? 'opacity-80 grayscale' : ''} ${isEditing && selectedObjIndex === -2 ? 'ring-2 ring-yellow-400 rounded' : ''}`}
                style={carStyle}
            >
                <div style={wheelStyle(true, true)} />
                <div style={wheelStyle(true, false)} />
                <div style={wheelStyle(false, true)} />
                <div style={wheelStyle(false, false)} />
                <div className="absolute inset-0 rounded-sm" style={{ backgroundColor: COLORS.carBody }}>
                    {/* Car Details */}
                    <div className="absolute top-1/2 left-[20%] w-[25%] h-[80%] -translate-y-1/2 rounded-sm" style={{ backgroundColor: COLORS.carGlass }} />
                    <div className="absolute top-1/2 left-[60%] w-[15%] h-[80%] -translate-y-1/2 rounded-sm" style={{ backgroundColor: COLORS.carGlass }} />
                    <div className="absolute top-[10%] right-0 w-[5%] h-[20%] bg-yellow-200 rounded-l-sm" />
                    <div className="absolute bottom-[10%] right-0 w-[5%] h-[20%] bg-yellow-200 rounded-l-sm" />
                    <div className="absolute top-[10%] left-0 w-[5%] h-[20%] rounded-r-sm" style={{ backgroundColor: car.gear === 'P' ? '#ff9999' : '#990000' }} />
                    <div className="absolute bottom-[10%] left-0 w-[5%] h-[20%] rounded-r-sm" style={{ backgroundColor: car.gear === 'P' ? '#ff9999' : '#990000' }} />
                </div>
            </div>
            </div>
          </div>

          {/* Right Panel: Controls OR Editor */}
          <div className="flex flex-col gap-3 w-64 h-[400px]">
              
              {isEditing ? (
                  <EditorPanel 
                    level={level}
                    selectedObjIndex={selectedObjIndex}
                    onUpdateLevel={(l) => setLevel(l)}
                    onSave={saveCurrentLevel}
                    onDelete={() => {
                        if (selectedObjIndex !== null && selectedObjIndex >= 0) {
                            const newObs = level.obstacles.filter((_, i) => i !== selectedObjIndex);
                            setLevel({ ...level, obstacles: newObs });
                            setSelectedObjIndex(null);
                        }
                    }}
                    onClear={() => {
                         if(confirm("Clear all obstacles?")) {
                             setLevel({...level, obstacles: []});
                         }
                    }}
                  />
              ) : (
                <>
                {/* Playing Controls */}
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col items-center shadow-lg">
                    <h3 className="text-gray-500 text-[10px] uppercase tracking-wider mb-2 font-bold">Steering</h3>
                    <SteeringWheel currentStep={car.steeringStep} />
                    <div className="flex gap-2 mt-2 w-full justify-center">
                            <button 
                                className="p-2 bg-gray-700 hover:bg-gray-600 rounded active:bg-gray-500 transition-colors"
                                onClick={() => {
                                    if (carRef.current.steeringStep > -CAR_CONFIG.steeringSteps) {
                                        carRef.current.steeringStep -= 1;
                                        setCar({...carRef.current});
                                    }
                                }}
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <button 
                                className="p-2 bg-gray-700 hover:bg-gray-600 rounded active:bg-gray-500 transition-colors"
                                onClick={() => {
                                    if (carRef.current.steeringStep < CAR_CONFIG.steeringSteps) {
                                        carRef.current.steeringStep += 1;
                                        setCar({...carRef.current});
                                    }
                                }}
                            >
                                <ArrowRight size={16} />
                            </button>
                    </div>
                </div>

                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col items-center shadow-lg">
                    <h3 className="text-gray-500 text-[10px] uppercase tracking-wider mb-2 font-bold">Throttle Level</h3>
                    
                    <div className="flex gap-0.5 mb-2 w-full justify-center">
                        {[1, 2, 3, 4, 5].map(level => (
                            <div 
                                key={level} 
                                className={`w-2 h-4 rounded-sm transition-colors ${level <= car.speedLevel ? 'bg-yellow-400' : 'bg-gray-700'}`}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => adjustSpeed(-1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded active:bg-gray-500 transition-colors"
                            disabled={car.speedLevel <= 1}
                        >
                            <Minus size={14} className="text-white" />
                        </button>
                        <button 
                            onClick={() => adjustSpeed(1)}
                            className={`w-10 h-10 flex items-center justify-center rounded shadow transition-transform active:scale-95 ${car.speedLevel === 5 ? 'bg-gray-600' : 'bg-yellow-500 hover:bg-yellow-400 text-gray-900'}`}
                        >
                            <Zap size={20} fill="currentColor" />
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col items-center shadow-lg">
                    <h3 className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 font-bold">Transmission</h3>
                    <div className="text-2xl font-mono font-bold text-white mb-2">
                        {car.gear === 'D' && <span className="text-green-500">DRIVE</span>}
                        {car.gear === 'R' && <span className="text-orange-500">REVERSE</span>}
                        {car.gear === 'P' && <span className="text-red-500">PARK</span>}
                    </div>
                </div>
                </>
              )}
          </div>
      </div>
    </div>
  );
};

export default App;

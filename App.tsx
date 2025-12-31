import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CircleStop, Zap, Minus } from 'lucide-react';
import { CarState, Level, GameStatus } from './types';
import { LEVELS } from './game/levels';
import { CAR_CONFIG, COLORS } from './constants';
import { updateCarPhysics, getCarCorners, getRectCorners, checkCollision, checkWinCondition, toRad } from './utils/physics';
import { AICoach } from './components/AICoach';
import { SteeringWheel } from './components/SteeringWheel';

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
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [level, setLevel] = useState<Level>(LEVELS[0]);
  const [car, setCar] = useState<CarState>(getInitialState(LEVELS[0]));
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    isPlaying: false,
    hasCrashed: false,
    hasWon: false,
    message: "Ready to Start",
  });

  const requestRef = useRef<number>();
  const carRef = useRef<CarState>(getInitialState(LEVELS[0]));

  useEffect(() => {
    const l = LEVELS.find(l => l.id === currentLevelId) || LEVELS[0];
    setLevel(l);
    resetLevel(l);
  }, [currentLevelId]);

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

  const changeGear = (newGear: 'D' | 'R' | 'P') => {
    carRef.current.gear = newGear;
    // Reset to lowest speed when changing gears (safety first!)
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
        // If moving (not P), Stop. If Stopped (P), Go Forward (D).
        if (current.gear !== 'P') {
            changeGear('P');
        } else {
            changeGear('D');
        }
        break;
      case 'ArrowDown':
        // If moving (not P), Stop. If Stopped (P), Go Backward (R).
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
  }, [gameStatus]);

  // Game Loop
  const animate = () => {
    if (gameStatus.isPlaying && !gameStatus.hasCrashed && !gameStatus.hasWon) {
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
  }, [gameStatus.isPlaying, gameStatus.hasCrashed, gameStatus.hasWon]);

  // Styling
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
      
      {/* Compact Header */}
      <div className="flex-none h-12 flex items-center justify-between px-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-white">Precision<span className="text-blue-500">Parker</span></h1>
          <span className="hidden md:inline text-xs text-gray-500 border-l border-gray-600 pl-3">{level.name}</span>
        </div>
        <div className="flex gap-2">
           <select 
             className="bg-gray-700 text-xs text-white border-gray-600 rounded px-2 py-1 outline-none"
             value={currentLevelId}
             onChange={(e) => setCurrentLevelId(Number(e.target.value))}
           >
             {LEVELS.map(l => <option key={l.id} value={l.id}>Lvl {l.id}: {l.name}</option>)}
           </select>
           <button 
             onClick={() => resetLevel(level)} 
             className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white transition"
             title="Restart"
            >
             <RotateCcw size={16} />
           </button>
        </div>
      </div>

      {/* Main Content: Row Layout */}
      <div className="flex-1 flex items-center justify-center p-2 gap-4">
          
          {/* Game Canvas Container */}
          <div className="relative bg-gray-800 border-4 border-gray-700 rounded-lg shadow-2xl flex-shrink-0">
            {/* Status Overlay */}
            {(gameStatus.hasCrashed || gameStatus.hasWon || !gameStatus.isPlaying) && (
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

            <AICoach carState={car} level={level} hasCrashed={gameStatus.hasCrashed} />

            <div 
            className="relative overflow-hidden bg-gray-900 rounded"
            style={{ width: level.bounds.width, height: level.bounds.height, backgroundColor: COLORS.asphalt }}
            >
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            <div 
                className="absolute border-2 border-dashed flex items-center justify-center"
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

            {level.obstacles.map((obs, idx) => (
                <div 
                key={idx}
                className="absolute bg-gray-700 border border-gray-600"
                style={{
                    left: obs.x,
                    top: obs.y,
                    width: obs.width,
                    height: obs.height,
                    transform: `rotate(${obs.rotation || 0}deg)`
                }}
                />
            ))}

            <div 
                className={`absolute shadow-lg z-0 transition-opacity duration-75 ${gameStatus.hasCrashed ? 'opacity-80 grayscale' : ''}`}
                style={carStyle}
            >
                <div style={wheelStyle(true, true)} />
                <div style={wheelStyle(true, false)} />
                <div style={wheelStyle(false, true)} />
                <div style={wheelStyle(false, false)} />
                <div className="absolute inset-0 rounded-sm" style={{ backgroundColor: COLORS.carBody }}>
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

          {/* Right Panel: Controls Stack */}
          <div className="flex flex-col gap-3 w-48">
              
              {/* Steering */}
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

               {/* Throttle */}
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

              {/* Status Display */}
              <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col items-center shadow-lg">
                  <h3 className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 font-bold">Transmission</h3>
                  <div className="text-2xl font-mono font-bold text-white mb-2">
                      {car.gear === 'D' && <span className="text-green-500">DRIVE</span>}
                      {car.gear === 'R' && <span className="text-orange-500">REVERSE</span>}
                      {car.gear === 'P' && <span className="text-red-500">PARK</span>}
                  </div>
                  <div className="text-[10px] text-gray-400 text-center leading-tight">
                      Click <span className="text-white font-bold">↑</span> / <span className="text-white font-bold">↓</span> to Start/Stop.
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default App;

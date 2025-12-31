import React from 'react';
import { CAR_CONFIG } from '../constants';

interface SteeringWheelProps {
  currentStep: number; // -10 to 10
}

export const SteeringWheel: React.FC<SteeringWheelProps> = ({ currentStep }) => {
  // Map discrete step (-10 to 10) to visual rotation (-540 to 540 degrees)
  const rotationDeg = (currentStep / CAR_CONFIG.steeringSteps) * (CAR_CONFIG.visualLockTurns * 360);
  
  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative w-24 h-24 bg-gray-800 rounded-full border-4 border-gray-600 shadow-xl flex items-center justify-center overflow-hidden">
        {/* Rotating Wheel Container */}
        <div 
            className="w-full h-full relative transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${rotationDeg}deg)` }}
        >
            {/* Rim */}
            <div className="absolute inset-1.5 rounded-full border-[4px] border-gray-400"></div>
            
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 w-6 h-6 -ml-3 -mt-3 bg-gray-300 rounded-full z-10 shadow-md">
                 <div className="w-full h-full flex items-center justify-center text-[6px] font-bold text-gray-600">
                    LOGO
                 </div>
            </div>
            
            {/* Spokes */}
            {/* Horizontal Bar */}
            <div className="absolute top-1/2 left-0 w-full h-2 -mt-1 bg-gray-500"></div>
            {/* Vertical Bottom Spoke */}
            <div className="absolute top-1/2 left-1/2 w-2 h-1/2 -ml-1 bg-gray-500"></div>
            
            {/* Visual Marker for Top Center */}
            <div className="absolute top-0 left-1/2 w-1.5 h-3 -ml-0.5 bg-red-500 z-20"></div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="mt-1 text-center">
          <div className="text-gray-300 font-mono text-xs">
             Step: <span className={currentStep === 0 ? 'text-white' : currentStep > 0 ? 'text-blue-400' : 'text-orange-400'}>
                 {currentStep}
             </span>
          </div>
      </div>
    </div>
  );
};

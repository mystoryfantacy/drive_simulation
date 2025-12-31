import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CarState, Level } from '../types';
import { Brain, MessageSquare } from 'lucide-react';
import { CAR_CONFIG } from '../constants';

interface AICoachProps {
  carState: CarState;
  level: Level;
  hasCrashed: boolean;
}

export const AICoach: React.FC<AICoachProps> = ({ carState, level, hasCrashed }) => {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const getAdvice = async () => {
    if (!process.env.API_KEY) {
      setAdvice("API Key not found. Cannot consult AI Coach.");
      setShowDialog(true);
      return;
    }

    setLoading(true);
    setShowDialog(true);
    setAdvice("Analyzing collision geometry...");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Calculate current steering angle for display
      const anglePerStep = CAR_CONFIG.maxSteeringAngle / CAR_CONFIG.steeringSteps;
      const currentAngleDeg = (carState.steeringStep * anglePerStep * 180 / Math.PI).toFixed(1);

      const prompt = `
        I am playing a 2D top-down driving parking puzzle game.
        I am currently stuck or crashed.
        
        My Car State:
        - Position: x=${carState.x.toFixed(1)}, y=${carState.y.toFixed(1)}
        - Heading: ${(carState.heading * 180 / Math.PI).toFixed(1)} degrees
        - Gear: ${carState.gear} (D=Forward, R=Reverse, P=Park)
        - Steering: Step ${carState.steeringStep} / ${CAR_CONFIG.steeringSteps} (${currentAngleDeg} degrees)
        
        The Goal Target is at: x=${level.target.x}, y=${level.target.y}
        
        Level Description: ${level.description}
        Status: ${hasCrashed ? "CRASHED" : "STUCK/PAUSED"}
        
        Provide a short, 1-sentence specific tip on how to maneuver out of this or avoid the crash next time. Use terms like "Turn wheel left 2 clicks", "Put in Reverse", etc.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAdvice(response.text || "Try approaching slower and watch your angles.");
    } catch (e) {
      console.error(e);
      setAdvice("AI Coach is currently offline. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-20">
      <button
        onClick={getAdvice}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full shadow-lg transition-colors font-medium text-sm"
      >
        <Brain size={16} />
        AI Coach
      </button>

      {showDialog && (
        <div className="absolute top-12 right-0 w-64 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl text-sm z-30">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-purple-400 font-bold flex items-center gap-2">
              <MessageSquare size={14} /> Coach
            </h4>
            <button onClick={() => setShowDialog(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-slate-200 leading-relaxed">
            {loading ? <span className="animate-pulse">Analyzing...</span> : advice}
          </p>
        </div>
      )}
    </div>
  );
};

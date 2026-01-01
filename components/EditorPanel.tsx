import React from 'react';
import { Level, Rect } from '../types';
import { Plus, Trash2, Save, Move } from 'lucide-react';

interface EditorPanelProps {
  level: Level;
  selectedObjIndex: number | null; // -1 for Target, -2 for Start, >=0 for Obstacles
  onUpdateLevel: (l: Level) => void;
  onSave: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
  level, 
  selectedObjIndex, 
  onUpdateLevel, 
  onSave, 
  onDelete,
  onClear
}) => {
  
  const handlePropChange = (field: string, value: number) => {
    if (selectedObjIndex === null) return;

    const newLevel = { ...level };

    if (selectedObjIndex === -1) {
       // Target
       newLevel.target = { ...newLevel.target, [field]: value };
    } else if (selectedObjIndex === -2) {
       // Start
       newLevel.start = { ...newLevel.start, [field]: value };
    } else {
       // Obstacle
       const obs = [...newLevel.obstacles];
       obs[selectedObjIndex] = { ...obs[selectedObjIndex], [field]: value };
       newLevel.obstacles = obs;
    }
    onUpdateLevel(newLevel);
  };

  const handleNameChange = (val: string) => {
    onUpdateLevel({ ...level, name: val });
  };

  const addObstacle = () => {
    const newLevel = { ...level };
    newLevel.obstacles = [
      ...newLevel.obstacles,
      { x: 250, y: 200, width: 40, height: 40, rotation: 0 }
    ];
    onUpdateLevel(newLevel);
  };

  let selectedObject: Rect | { x: number, y: number, heading: number } | null = null;
  let isStart = false;

  if (selectedObjIndex === -1) selectedObject = level.target;
  else if (selectedObjIndex === -2) {
      selectedObject = level.start;
      isStart = true;
  }
  else if (selectedObjIndex !== null && level.obstacles[selectedObjIndex]) {
      selectedObject = level.obstacles[selectedObjIndex];
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col gap-4 shadow-lg w-full h-full overflow-y-auto">
      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
        <h3 className="text-white font-bold flex items-center gap-2">
           <Move size={16} className="text-blue-400"/> Level Editor
        </h3>
        <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-400 uppercase">Level Name</label>
        <input 
          type="text" 
          value={level.name} 
          onChange={(e) => handleNameChange(e.target.value)}
          className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
        />
      </div>

      <div className="border-t border-gray-700 pt-2">
          <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase">
              {selectedObjIndex === null ? 'No Selection' : 
               selectedObjIndex === -1 ? 'Selected: Goal' : 
               selectedObjIndex === -2 ? 'Selected: Start Car' : 
               `Selected: Wall #${selectedObjIndex + 1}`}
          </h4>
          
          {selectedObject ? (
              <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                      <label className="text-[10px] text-gray-500">X</label>
                      <input type="number" value={Math.round(selectedObject.x)} onChange={(e) => handlePropChange('x', Number(e.target.value))} className="bg-gray-700 rounded px-1 text-sm text-white"/>
                  </div>
                  <div className="flex flex-col">
                      <label className="text-[10px] text-gray-500">Y</label>
                      <input type="number" value={Math.round(selectedObject.y)} onChange={(e) => handlePropChange('y', Number(e.target.value))} className="bg-gray-700 rounded px-1 text-sm text-white"/>
                  </div>
                  {!isStart && 'width' in selectedObject && (
                      <>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-gray-500">Width</label>
                            <input type="number" value={selectedObject.width} onChange={(e) => handlePropChange('width', Number(e.target.value))} className="bg-gray-700 rounded px-1 text-sm text-white"/>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-gray-500">Height</label>
                            <input type="number" value={selectedObject.height} onChange={(e) => handlePropChange('height', Number(e.target.value))} className="bg-gray-700 rounded px-1 text-sm text-white"/>
                        </div>
                      </>
                  )}
                  <div className="flex flex-col col-span-2">
                      <label className="text-[10px] text-gray-500">Rotation (Deg)</label>
                      <input type="number" 
                        value={isStart ? Math.round((selectedObject as any).heading) : (selectedObject as Rect).rotation || 0} 
                        onChange={(e) => handlePropChange(isStart ? 'heading' : 'rotation', Number(e.target.value))} 
                        className="bg-gray-700 rounded px-1 text-sm text-white"
                      />
                  </div>
              </div>
          ) : (
              <div className="text-xs text-gray-500 italic py-4 text-center">
                  Click on an object in the preview to edit its properties.
              </div>
          )}
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-gray-700">
         <button onClick={addObstacle} className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm transition-colors">
            <Plus size={16} /> Add Obstacle
         </button>
         
         {selectedObjIndex !== null && selectedObjIndex >= 0 && (
             <button onClick={onDelete} className="flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900 text-red-200 p-2 rounded text-sm transition-colors border border-red-800">
                <Trash2 size={16} /> Delete Selected
             </button>
         )}

         <button onClick={onSave} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white p-2 rounded font-bold text-sm transition-colors shadow-lg mt-2">
            <Save size={16} /> Save Level
         </button>
      </div>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import WorldMap from './components/WorldMap';
import Dashboard from './components/Dashboard';
import { generateDailyEvent } from './services/geminiService';

const App: React.FC = () => {
  const { gameState, setGameState, purchaseUpgrade, influenceEconomy, addLog, toggleAi, togglePause } = useGameEngine();
  const [showWelcome, setShowWelcome] = useState(true);

  // Daily Event Trigger (Randomly roughly every 30 seconds of active play)
  useEffect(() => {
    const timer = setInterval(async () => {
      if (Math.random() > 0.7 && !gameState.paused) {
        // Now handles disabled AI internally
        const event = await generateDailyEvent(gameState);
        if (event) {
          addLog(`EVENT: ${event.title}`, 'ai');
          // Apply effect
          if (event.effectType !== 'none') {
             setGameState(prev => {
                const ns = { ...prev };
                if (event.effectType === 'money') ns.economy.balance += event.effectValue;
                if (event.effectType === 'tourism') ns.economy.tourismScore += event.effectValue;
                if (event.effectType === 'demand') ns.economy.demand += event.effectValue;
                return ns;
             });
          }
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [gameState.paused, addLog, setGameState, gameState.aiEnabled]);

  return (
    <div className="w-full h-full relative font-sans text-slate-800">
      
      {/* Game Layer */}
      <WorldMap 
        gameState={gameState} 
        onPlaneClick={(id) => setGameState(prev => ({ ...prev, selectedPlaneId: id }))} 
      />

      {/* UI Layer */}
      <Dashboard 
        gameState={gameState}
        onUpgrade={purchaseUpgrade}
        onInfluence={influenceEconomy}
        onClosePlane={() => setGameState(prev => ({ ...prev, selectedPlaneId: null }))}
        addLog={addLog}
        onToggleAi={toggleAi}
        onTogglePause={togglePause}
      />

      {/* Welcome Modal */}
      {showWelcome && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✈️</div>
                <h1 className="text-3xl font-bold mb-2 text-slate-800">SkyHarbor Tycoon</h1>
                <p className="text-slate-500 mb-6">
                    Welcome, Airport Manager! Grow your regional strip into an international hub. 
                    Use AI to negotiate deals and manage crises.
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => setShowWelcome(false)}
                        className="bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                        Open Airport
                    </button>
                    <div className="text-xs text-slate-400">
                        Pro Tip: Check the "Economy" tab to boost demand early on.
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;

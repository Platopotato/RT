import React, { useState } from 'react';
import { User } from '../../lib/types';
import { TRIBE_COLORS, TRIBE_ICONS } from '../../lib/constants';
import StatAllocator from './StatAllocator';

interface LobbyScreenProps {
  onTribeCreate: (tribeData: {
    playerName: string;
    tribeName: string;
    icon: string;
    color: string;
    stats: {
      charisma: number;
      intelligence: number;
      leadership: number;
      strength: number;
    };
  }) => void;
  user: Omit<User, 'passwordHash' | 'securityAnswerHash'>;
  onLogout: () => void;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({ onTribeCreate, user, onLogout }) => {
  const [playerName, setPlayerName] = useState(user.username);
  const [tribeName, setTribeName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(Object.keys(TRIBE_ICONS)[0]);
  const [selectedColor, setSelectedColor] = useState(TRIBE_COLORS[0]);
  const [stats, setStats] = useState({
    charisma: 1,
    intelligence: 1,
    leadership: 1,
    strength: 1,
  });
  const [step, setStep] = useState<'welcome' | 'create-tribe'>('welcome');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTribeCreate({
      playerName,
      tribeName,
      icon: selectedIcon,
      color: selectedColor,
      stats,
    });
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 rounded-lg shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-500 mb-4">Welcome to Radix Tribes</h1>
            <p className="text-xl text-slate-300">
              A post-apocalyptic strategy game where you lead your tribe to survival and dominance
            </p>
          </div>
          
          <div className="mb-8 text-slate-300">
            <h2 className="text-2xl font-semibold text-amber-400 mb-4">Game Overview</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Lead your tribe through a dangerous wasteland</li>
              <li>Gather resources, recruit followers, and research technologies</li>
              <li>Form alliances or wage war against other tribes</li>
              <li>Expand your territory by building outposts</li>
              <li>Survive and thrive in a hostile post-apocalyptic world</li>
            </ul>
          </div>
          
          <div className="text-center mb-6">
            <p className="text-slate-300 mb-4">
              Welcome, <span className="font-bold text-amber-400">{user.username}</span>!
              Are you ready to lead your tribe to glory?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep('create-tribe')}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition duration-200"
              >
                Create Your Tribe
              </button>
              <button
                onClick={onLogout}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-lg transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center text-slate-400 text-sm">
            <p>Game Version 1.0.0 | Turn-based Strategy</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-amber-500 mb-6 text-center">Create Your Tribe</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-slate-300 mb-2 font-semibold">Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-slate-300 mb-2 font-semibold">Tribe Name</label>
            <input
              type="text"
              value={tribeName}
              onChange={(e) => setTribeName(e.target.value)}
              className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="Enter a name for your tribe"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Tribe Icon</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(TRIBE_ICONS).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`p-3 rounded-lg ${
                      selectedIcon === icon
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => setSelectedIcon(icon)}
                  >
                    <span className="text-xl">{icon}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">Tribe Color</label>
              <div className="grid grid-cols-4 gap-2">
                {TRIBE_COLORS.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-10 rounded-lg border-2 ${
                      selectedColor === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <label className="block text-slate-300 mb-2 font-semibold">Tribe Stats</label>
            <p className="text-slate-400 mb-4 text-sm">
              Allocate points to define your tribe's strengths. Each stat affects different aspects of gameplay.
            </p>
            <StatAllocator stats={stats} onStatsChange={setStats} />
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep('welcome')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-lg transition duration-200"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition duration-200"
            >
              Create Tribe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LobbyScreen;

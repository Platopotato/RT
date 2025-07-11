
import React, { useState, useMemo } from 'react';
import { TribeStats, User, Tribe } from '../types';
import { MAX_STAT_POINTS, MIN_STAT_VALUE, TRIBE_ICONS, TRIBE_COLORS } from '../constants';
import StatAllocator from './StatAllocator';
import IconSelector from './IconSelector';
import Card from './ui/Card';
import Button from './ui/Button';

type TribeCreationData = {
    playerName: string;
    tribeName: string;
    icon: string;
    color: string;
    stats: TribeStats;
};

interface TribeCreationProps {
  onTribeCreate: (tribe: TribeCreationData) => void;
  user: User;
  tribes: Tribe[];
  startingLocations: string[];
}

const ColorSelector: React.FC<{ selectedColor: string; onSelect: (color: string) => void; }> = ({ selectedColor, onSelect }) => (
    <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Choose Your Tribe's Color</label>
        <div className="flex justify-center items-center flex-wrap gap-2 p-3 bg-slate-700/50 rounded-lg">
            {TRIBE_COLORS.map(color => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onSelect(color)}
                    className={`w-10 h-10 rounded-full transition-all duration-200 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-amber-400' : ''}`}
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    </div>
);

const TribeCreation: React.FC<TribeCreationProps> = ({ onTribeCreate, user, tribes, startingLocations }) => {
  const [playerName, setPlayerName] = useState(user.username);
  const [tribeName, setTribeName] = useState('');
  
  const [selectedIcon, setSelectedIcon] = useState<string>(Object.keys(TRIBE_ICONS)[0] || 'skull');
  const [selectedColor, setSelectedColor] = useState<string>(TRIBE_COLORS[0]);

  const [stats, setStats] = useState<TribeStats>({
    charisma: MIN_STAT_VALUE,
    intelligence: MIN_STAT_VALUE,
    leadership: MIN_STAT_VALUE,
    strength: MIN_STAT_VALUE,
  });

  const totalPointsUsed = useMemo(() => {
    return Object.values(stats).reduce((sum, value) => sum + value, 0);
  }, [stats]);

  const remainingPoints = MAX_STAT_POINTS - totalPointsUsed;
  
  const noMoreSlots = useMemo(() => {
    const occupiedLocations = new Set(tribes.map(t => t.location));
    return !startingLocations.some(loc => !occupiedLocations.has(loc));
  }, [tribes, startingLocations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (noMoreSlots) {
       alert("The admin has not set any available starting locations for new players. Please contact the administrator.");
      return;
    }

    if (remainingPoints !== 0 || !playerName || !tribeName) {
      alert('Please fill out all fields and allocate all stat points.');
      return;
    }

    const newTribeData: TribeCreationData = {
      playerName,
      tribeName,
      icon: selectedIcon,
      color: selectedColor,
      stats,
    };
    onTribeCreate(newTribeData);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900">
      <Card title="Found a New Tribe" className="max-w-2xl w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          <p className="text-slate-400 text-center">The old world is gone, {user.username}. Lead your survivors to a new dawn.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-1">Your Name</label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label htmlFor="tribeName" className="block text-sm font-medium text-slate-300 mb-1">Tribe Name</label>
              <input
                type="text"
                id="tribeName"
                value={tribeName}
                onChange={(e) => setTribeName(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
          </div>

          <IconSelector selectedIcon={selectedIcon} onSelect={setSelectedIcon} />
          <ColorSelector selectedColor={selectedColor} onSelect={setSelectedColor} />
          
          <StatAllocator stats={stats} setStats={setStats} remainingPoints={remainingPoints} />

          <Button type="submit" disabled={remainingPoints !== 0 || !playerName || !tribeName || noMoreSlots} className="w-full">
            {noMoreSlots ? "No Available Slots" : "Begin Survival"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default TribeCreation;

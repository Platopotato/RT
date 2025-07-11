
import React from 'react';
import { TribeStats } from '../types';
import { MIN_STAT_VALUE, MAX_STAT_POINTS } from '../constants';

interface StatAllocatorProps {
  stats: TribeStats;
  setStats: React.Dispatch<React.SetStateAction<TribeStats>>;
  remainingPoints: number;
}

const StatAllocator: React.FC<StatAllocatorProps> = ({ stats, setStats, remainingPoints }) => {
  const handleStatChange = (stat: keyof TribeStats, delta: number) => {
    setStats(prevStats => {
        const currentTotal = (Object.keys(prevStats) as Array<keyof TribeStats>).reduce((sum, key) => sum + prevStats[key], 0);

        // First-level check: Prevent invalid operations based on the current state.
        // This prevents adding points if we are already at or over the max.
        if (delta > 0 && currentTotal >= MAX_STAT_POINTS) {
            return prevStats;
        }

        // Prevent reducing a stat below its minimum value.
        if (delta < 0 && prevStats[stat] <= MIN_STAT_VALUE) {
            return prevStats;
        }

        // If checks pass, create the potential new state.
        const newStats = {
            ...prevStats,
            [stat]: prevStats[stat] + delta,
        };
        
        // Second-level check: A final safeguard. The new total should not exceed the max.
        // This handles any edge cases and ensures the final state is always valid.
        const newTotal = (Object.keys(newStats) as Array<keyof TribeStats>).reduce((sum, key) => sum + newStats[key], 0);
        if (newTotal > MAX_STAT_POINTS) {
            return prevStats; // The change was invalid, revert.
        }

        return newStats;
    });
  };

  return (
    <div className="bg-slate-700/50 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-md font-semibold text-slate-300">Allocate Attribute Points</h4>
        <div className="text-lg font-bold text-amber-400">
          {remainingPoints} <span className="text-sm font-normal text-slate-400">Points Left</span>
        </div>
      </div>
      <div className="space-y-3">
        {Object.keys(stats).map(statKey => {
          const key = statKey as keyof TribeStats;
          return (
            <div key={key} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-md">
              <span className="capitalize font-medium text-slate-300">{key}</span>
              <div className="flex items-center space-x-3">
                <button type="button" onClick={() => handleStatChange(key, -1)} disabled={stats[key] <= MIN_STAT_VALUE} className="w-8 h-8 rounded-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold">-</button>
                <span className="w-8 text-center font-bold text-xl text-white">{stats[key]}</span>
                <button type="button" onClick={() => handleStatChange(key, 1)} disabled={remainingPoints <= 0} className="w-8 h-8 rounded-full bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold">+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatAllocator;

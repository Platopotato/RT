import { Tribe, AIType, DiplomaticStatus, TribeStats } from '../../../../lib/types';
import { TRIBE_ICONS, TRIBE_COLORS, INITIAL_GLOBAL_RESOURCES, VISIBILITY_RANGE } from '../../../../lib/constants';
import { getHexesInRange, parseHexCoords } from '../../../../lib/mapUtils';

// AI tribe name components for generating random tribe names
const TRIBE_NAME_PREFIXES = [
  'Iron', 'Steel', 'Rust', 'Scrap', 'Savage', 'Rogue', 'Shadow', 'Wasteland', 
  'Dust', 'Ash', 'Bone', 'Blood', 'Venom', 'Toxic', 'Radiant', 'Thunder',
  'Storm', 'Flame', 'Ember', 'Frost', 'Night', 'Dusk', 'Dawn', 'Phantom'
];

const TRIBE_NAME_SUFFIXES = [
  'Raiders', 'Marauders', 'Bandits', 'Wolves', 'Vipers', 'Scorpions', 'Jackals', 
  'Vultures', 'Ghosts', 'Stalkers', 'Hunters', 'Nomads', 'Outcasts', 'Scavengers',
  'Ravagers', 'Reavers', 'Warband', 'Horde', 'Clan', 'Tribe', 'Legion', 'Pack'
];

/**
 * Generates a new AI tribe at the specified location
 * 
 * @param startLocation The hex coordinate where the tribe should start
 * @param existingTribeNames Array of existing tribe names to avoid duplicates
 * @returns A new Tribe object configured as an AI tribe
 */
export function generateAITribe(startLocation: string, existingTribeNames: string[]): Tribe {
  // Generate a unique tribe name
  let tribeName = generateUniqueTribeName(existingTribeNames);
  
  // Select random icon and color
  const iconKeys = Object.keys(TRIBE_ICONS);
  const randomIcon = iconKeys[Math.floor(Math.random() * iconKeys.length)];
  const randomColor = TRIBE_COLORS[Math.floor(Math.random() * TRIBE_COLORS.length)];
  
  // Generate random tribe stats with a total of 20-25 points
  const stats = generateAIStats();
  
  // Calculate initial explored hexes
  const startCoords = parseHexCoords(startLocation);
  const initialExplored = getHexesInRange(startCoords, VISIBILITY_RANGE);
  
  // Create the AI tribe
  const aiTribe: Tribe = {
    id: `ai-tribe-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    playerId: 'ai',
    isAI: true,
    aiType: AIType.Wanderer,
    playerName: 'AI',
    tribeName,
    icon: randomIcon,
    color: randomColor,
    stats,
    globalResources: {
      // AI tribes get slightly more starting resources
      food: INITIAL_GLOBAL_RESOURCES.food * 1.5,
      scrap: INITIAL_GLOBAL_RESOURCES.scrap * 1.2,
      morale: INITIAL_GLOBAL_RESOURCES.morale
    },
    garrisons: {
      [startLocation]: {
        // AI tribes start with more troops and weapons
        troops: 30,
        weapons: 15,
        chiefs: []
      }
    },
    location: startLocation,
    turnSubmitted: false,
    actions: [],
    lastTurnResults: [],
    exploredHexes: initialExplored,
    rationLevel: 'Normal',
    completedTechs: [],
    assets: [],
    currentResearch: null,
    journeyResponses: [],
    diplomacy: {}
  };
  
  return aiTribe;
}

/**
 * Generates a unique tribe name not already taken by existing tribes
 */
function generateUniqueTribeName(existingTribeNames: string[]): string {
  let attempts = 0;
  let tribeName = '';
  
  do {
    const prefix = TRIBE_NAME_PREFIXES[Math.floor(Math.random() * TRIBE_NAME_PREFIXES.length)];
    const suffix = TRIBE_NAME_SUFFIXES[Math.floor(Math.random() * TRIBE_NAME_SUFFIXES.length)];
    tribeName = `${prefix} ${suffix}`;
    attempts++;
    
    // Avoid infinite loop if we somehow can't find a unique name
    if (attempts > 100) {
      tribeName = `AI Tribe ${Date.now()}`;
      break;
    }
  } while (existingTribeNames.includes(tribeName));
  
  return tribeName;
}

/**
 * Generates random tribe stats for an AI tribe
 * Each AI type could have different stat distributions
 */
function generateAIStats(): TribeStats {
  // Total points to distribute (between 20-25)
  const totalPoints = 20 + Math.floor(Math.random() * 6);
  
  // Start with minimum values
  let stats: TribeStats = {
    charisma: 1,
    intelligence: 1,
    leadership: 1,
    strength: 1
  };
  
  // Remaining points to distribute
  let remainingPoints = totalPoints - 4;
  
  // Randomly distribute remaining points
  while (remainingPoints > 0) {
    const statKeys: (keyof TribeStats)[] = ['charisma', 'intelligence', 'leadership', 'strength'];
    const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
    
    stats[randomStat]++;
    remainingPoints--;
  }
  
  return stats;
}

/**
 * Generates AI tribe actions based on its type and current state
 * This is a placeholder and would be implemented in aiActions.ts
 */
export function getAITribePersonality(aiType: AIType): {
  aggressiveness: number;  // 0-1, how likely to attack
  expansionism: number;    // 0-1, how likely to build outposts
  tradingAffinity: number; // 0-1, how likely to trade
} {
  switch (aiType) {
    case AIType.Wanderer:
      return {
        aggressiveness: 0.7,
        expansionism: 0.5,
        tradingAffinity: 0.3
      };
    default:
      return {
        aggressiveness: 0.5,
        expansionism: 0.5,
        tradingAffinity: 0.5
      };
  }
}

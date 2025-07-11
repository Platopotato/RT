import { 
  Tribe, 
  HexData, 
  GameAction, 
  ActionType, 
  TerrainType,
  AIType,
  DiplomaticStatus
} from '../../../../lib/types';
import { getAITribePersonality } from './aiTribeGenerator';
import { formatHexCoords, parseHexCoords, axialDistance, findPath } from '../../../../lib/mapUtils';
import { getAvailableTechnologies } from '../data/technologyData';

/**
 * Generates AI actions for a tribe based on its current state and personality
 * 
 * @param tribe The AI tribe to generate actions for
 * @param allTribes All tribes in the game (for diplomatic decisions)
 * @param mapData The current map data
 * @returns Array of game actions for the AI tribe to perform
 */
export function generateAIActions(
  tribe: Tribe,
  allTribes: Tribe[],
  mapData: HexData[]
): GameAction[] {
  if (!tribe.isAI) return [];
  
  const actions: GameAction[] = [];
  const personality = getAITribePersonality(tribe.aiType || AIType.Wanderer);
  
  // Determine tribe's current needs and priorities
  const needsFood = tribe.globalResources.food < 100;
  const needsScrap = tribe.globalResources.food < 30;
  const needsTroops = Object.values(tribe.garrisons).reduce((sum, g) => sum + g.troops, 0) < 50;
  const needsWeapons = Object.values(tribe.garrisons).reduce((sum, g) => sum + g.weapons, 0) < 30;
  
  // Calculate total troops and their distribution
  const totalTroops = Object.values(tribe.garrisons).reduce((sum, g) => sum + g.troops, 0);
  const totalWeapons = Object.values(tribe.garrisons).reduce((sum, g) => sum + g.weapons, 0);
  
  // Set ration level based on food supply
  if (tribe.globalResources.food < 50) {
    actions.push({
      id: `ai-rations-${Date.now()}`,
      actionType: ActionType.SetRations,
      actionData: { ration_level: 'Hard' }
    });
  } else if (tribe.globalResources.food > 200) {
    actions.push({
      id: `ai-rations-${Date.now()}`,
      actionType: ActionType.SetRations,
      actionData: { ration_level: 'Normal' }
    });
  }
  
  // RECRUITMENT - Always try to recruit if we have food and need troops
  if (tribe.globalResources.food > 50 && needsTroops) {
    const recruitmentFood = Math.min(
      Math.floor(tribe.globalResources.food * 0.3),
      100
    );
    
    actions.push({
      id: `ai-recruit-${Date.now()}`,
      actionType: ActionType.Recruit,
      actionData: {
        food_offered: recruitmentFood,
        start_location: tribe.location
      }
    });
  }
  
  // WEAPON PRODUCTION - Build weapons if we have scrap and need weapons
  if (tribe.globalResources.scrap > 30 && needsWeapons) {
    const scrapToUse = Math.min(
      Math.floor(tribe.globalResources.scrap * 0.5),
      50
    );
    
    actions.push({
      id: `ai-weapons-${Date.now()}`,
      actionType: ActionType.BuildWeapons,
      actionData: {
        scrap: scrapToUse,
        start_location: tribe.location
      }
    });
  }
  
  // RESEARCH - Start research if not already researching
  if (!tribe.currentResearch) {
    const availableTechs = getAvailableTechnologies(tribe.completedTechs);
    if (availableTechs.length > 0 && tribe.globalResources.scrap >= 20) {
      // Choose a technology based on tribe's needs
      let chosenTech = availableTechs[0];
      
      if (needsFood) {
        const foodTech = availableTechs.find(tech => 
          tech.effects.some(e => e.type === 'PASSIVE_FOOD_GENERATION')
        );
        if (foodTech) chosenTech = foodTech;
      } else if (needsWeapons) {
        const combatTech = availableTechs.find(tech => 
          tech.effects.some(e => e.type === 'COMBAT_BONUS_ATTACK' || e.type === 'COMBAT_BONUS_DEFENSE')
        );
        if (combatTech) chosenTech = combatTech;
      }
      
      if (tribe.globalResources.scrap >= chosenTech.cost.scrap) {
        const mainGarrison = tribe.garrisons[tribe.location];
        const assignableTroops = Math.min(
          Math.floor(mainGarrison.troops * 0.3),
          chosenTech.requiredTroops + 2
        );
        
        if (assignableTroops >= chosenTech.requiredTroops) {
          actions.push({
            id: `ai-research-${Date.now()}`,
            actionType: ActionType.StartResearch,
            actionData: {
              techId: chosenTech.id,
              location: tribe.location,
              assignedTroops: assignableTroops
            }
          });
        }
      }
    }
  }
  
  // RESOURCE GATHERING - Scavenge for needed resources
  if ((needsFood || needsScrap) && totalTroops > 10) {
    // Find suitable scavenging locations
    const scavengingTargets = findScavengingTargets(tribe, mapData);
    
    if (scavengingTargets.length > 0) {
      const target = scavengingTargets[0];
      const resourceType = needsFood ? 'Food' : 'Scrap';
      const mainGarrison = tribe.garrisons[tribe.location];
      
      if (mainGarrison && mainGarrison.troops >= 10) {
        const troopsToSend = Math.min(
          Math.floor(mainGarrison.troops * 0.4),
          20
        );
        
        const weaponsToSend = Math.min(
          Math.floor(mainGarrison.weapons * 0.3),
          troopsToSend / 2
        );
        
        actions.push({
          id: `ai-scavenge-${Date.now()}`,
          actionType: ActionType.Scavenge,
          actionData: {
            troops: troopsToSend,
            weapons: weaponsToSend,
            resource_type: resourceType,
            start_location: tribe.location,
            target_location: target,
            chiefsToMove: []
          }
        });
      }
    }
  }
  
  // EXPLORATION - Scout unexplored areas
  const shouldScout = Math.random() < 0.3; // 30% chance to scout
  if (shouldScout && totalTroops > 15) {
    const scoutingTargets = findScoutingTargets(tribe, mapData);
    
    if (scoutingTargets.length > 0) {
      const target = scoutingTargets[0];
      const mainGarrison = tribe.garrisons[tribe.location];
      
      if (mainGarrison && mainGarrison.troops >= 5) {
        actions.push({
          id: `ai-scout-${Date.now()}`,
          actionType: ActionType.Scout,
          actionData: {
            troops: 5,
            weapons: Math.min(2, mainGarrison.weapons),
            start_location: tribe.location,
            target_location: target,
            chiefsToMove: []
          }
        });
      }
    }
  }
  
  // EXPANSION - Build outposts if expansionist
  const shouldExpand = Math.random() < personality.expansionism;
  if (shouldExpand && tribe.globalResources.scrap >= 30 && totalTroops > 30) {
    const expansionTargets = findExpansionTargets(tribe, allTribes, mapData);
    
    if (expansionTargets.length > 0) {
      const target = expansionTargets[0];
      const mainGarrison = tribe.garrisons[tribe.location];
      
      if (mainGarrison && mainGarrison.troops >= 15) {
        actions.push({
          id: `ai-outpost-${Date.now()}`,
          actionType: ActionType.BuildOutpost,
          actionData: {
            troops: 15,
            weapons: Math.min(8, mainGarrison.weapons),
            start_location: tribe.location,
            finish_location: target,
            chiefsToMove: []
          }
        });
      }
    }
  }
  
  // AGGRESSION - Attack enemies if aggressive
  const shouldAttack = Math.random() < personality.aggressiveness;
  if (shouldAttack && totalTroops > 40 && totalWeapons > 15) {
    const attackTargets = findAttackTargets(tribe, allTribes, mapData);
    
    if (attackTargets.length > 0) {
      const target = attackTargets[0];
      const mainGarrison = tribe.garrisons[tribe.location];
      
      if (mainGarrison && mainGarrison.troops >= 25) {
        const troopsToSend = Math.min(
          Math.floor(mainGarrison.troops * 0.6),
          40
        );
        
        const weaponsToSend = Math.min(
          Math.floor(mainGarrison.weapons * 0.7),
          troopsToSend
        );
        
        actions.push({
          id: `ai-attack-${Date.now()}`,
          actionType: ActionType.Attack,
          actionData: {
            troops: troopsToSend,
            weapons: weaponsToSend,
            start_location: tribe.location,
            target_location: target,
            chiefsToMove: []
          }
        });
      }
    }
  }
  
  // TRADING - Trade with allies if trading affinity is high
  // (Placeholder - would implement actual trading logic here)
  
  // If no actions were generated, rest to improve morale
  if (actions.length === 0) {
    actions.push({
      id: `ai-rest-${Date.now()}`,
      actionType: ActionType.Rest,
      actionData: {
        troops: Math.floor(totalTroops * 0.5),
        start_location: tribe.location
      }
    });
  }
  
  return actions;
}

/**
 * Finds suitable scavenging targets for the tribe
 */
function findScavengingTargets(tribe: Tribe, mapData: HexData[]): string[] {
  const targets: string[] = [];
  const exploredHexes = new Set(tribe.exploredHexes);
  
  // Look for resource-rich hexes that the tribe has explored
  for (const hex of mapData) {
    const coordStr = formatHexCoords(hex.q, hex.r);
    
    if (!exploredHexes.has(coordStr)) continue;
    
    // Skip the tribe's own location
    if (coordStr === tribe.location) continue;
    
    // Skip locations where the tribe already has a garrison
    if (tribe.garrisons[coordStr]) continue;
    
    // Check for resource-rich terrain or POIs
    let isGoodTarget = false;
    
    if (hex.poi) {
      if (
        hex.poi.type === 'Scrapyard' ||
        hex.poi.type === 'Food Source' ||
        hex.poi.type === 'WeaponsCache' ||
        hex.poi.type === 'Mine' ||
        hex.poi.type === 'Factory'
      ) {
        isGoodTarget = true;
      }
    }
    
    // Resource-rich terrain
    if (
      hex.terrain === TerrainType.Forest ||
      hex.terrain === TerrainType.Plains ||
      hex.terrain === TerrainType.Ruins
    ) {
      isGoodTarget = true;
    }
    
    if (isGoodTarget) {
      // Check if there's a path to this location
      const path = findPath(
        parseHexCoords(tribe.location),
        parseHexCoords(coordStr),
        mapData
      );
      
      if (path) {
        targets.push(coordStr);
      }
    }
  }
  
  // Sort by distance from tribe's location
  const tribeCoords = parseHexCoords(tribe.location);
  return targets.sort((a, b) => {
    const aCoords = parseHexCoords(a);
    const bCoords = parseHexCoords(b);
    const aDist = axialDistance(tribeCoords, aCoords);
    const bDist = axialDistance(tribeCoords, bCoords);
    return aDist - bDist;
  });
}

/**
 * Finds suitable scouting targets for the tribe
 */
function findScoutingTargets(tribe: Tribe, mapData: HexData[]): string[] {
  const targets: string[] = [];
  const exploredHexes = new Set(tribe.exploredHexes);
  
  // Find unexplored hexes at the edge of explored territory
  for (const hex of mapData) {
    const coordStr = formatHexCoords(hex.q, hex.r);
    
    // Skip already explored hexes
    if (exploredHexes.has(coordStr)) continue;
    
    // Check if this hex is adjacent to an explored hex
    const neighbors = getNeighborCoords(hex.q, hex.r);
    const isAtExplorationFrontier = neighbors.some(n => exploredHexes.has(n));
    
    if (isAtExplorationFrontier) {
      // Check if there's a path to this location
      const path = findPath(
        parseHexCoords(tribe.location),
        parseHexCoords(coordStr),
        mapData
      );
      
      if (path) {
        targets.push(coordStr);
      }
    }
  }
  
  // Sort by distance from tribe's location
  const tribeCoords = parseHexCoords(tribe.location);
  return targets.sort((a, b) => {
    const aCoords = parseHexCoords(a);
    const bCoords = parseHexCoords(b);
    const aDist = axialDistance(tribeCoords, aCoords);
    const bDist = axialDistance(tribeCoords, bCoords);
    return aDist - bDist;
  });
}

/**
 * Finds suitable expansion targets for building outposts
 */
function findExpansionTargets(tribe: Tribe, allTribes: Tribe[], mapData: HexData[]): string[] {
  const targets: string[] = [];
  const exploredHexes = new Set(tribe.exploredHexes);
  const occupiedHexes = new Set();
  
  // Mark all hexes occupied by any tribe
  for (const t of allTribes) {
    Object.keys(t.garrisons).forEach(loc => occupiedHexes.add(loc));
  }
  
  // Find suitable hexes for expansion
  for (const hex of mapData) {
    const coordStr = formatHexCoords(hex.q, hex.r);
    
    // Skip unexplored hexes
    if (!exploredHexes.has(coordStr)) continue;
    
    // Skip already occupied hexes
    if (occupiedHexes.has(coordStr)) continue;
    
    // Skip water and radiation
    if (
      hex.terrain === TerrainType.Water ||
      hex.terrain === TerrainType.Radiation
    ) {
      continue;
    }
    
    // Prefer resource-rich terrain
    let score = 0;
    
    if (hex.poi) {
      if (
        hex.poi.type === 'Scrapyard' ||
        hex.poi.type === 'Food Source' ||
        hex.poi.type === 'Mine'
      ) {
        score += 5;
      }
    }
    
    if (
      hex.terrain === TerrainType.Plains ||
      hex.terrain === TerrainType.Forest
    ) {
      score += 3;
    }
    
    // Check distance from existing garrisons
    const hexCoords = parseHexCoords(coordStr);
    let tooClose = false;
    
    for (const garrisonLoc of Object.keys(tribe.garrisons)) {
      const garrisonCoords = parseHexCoords(garrisonLoc);
      const distance = axialDistance(hexCoords, garrisonCoords);
      
      if (distance < 3) {
        tooClose = true;
        break;
      }
    }
    
    if (!tooClose) {
      // Check if there's a path to this location
      const path = findPath(
        parseHexCoords(tribe.location),
        hexCoords,
        mapData
      );
      
      if (path) {
        targets.push(coordStr);
      }
    }
  }
  
  // Sort by distance from tribe's location
  const tribeCoords = parseHexCoords(tribe.location);
  return targets.sort((a, b) => {
    const aCoords = parseHexCoords(a);
    const bCoords = parseHexCoords(b);
    const aDist = axialDistance(tribeCoords, aCoords);
    const bDist = axialDistance(tribeCoords, bCoords);
    return aDist - bDist;
  });
}

/**
 * Finds suitable attack targets (enemy garrisons)
 */
function findAttackTargets(tribe: Tribe, allTribes: Tribe[], mapData: HexData[]): string[] {
  const targets: string[] = [];
  const exploredHexes = new Set(tribe.exploredHexes);
  
  // Find enemy garrisons in explored territory
  for (const otherTribe of allTribes) {
    // Skip self
    if (otherTribe.id === tribe.id) continue;
    
    // Skip allies
    const diplomaticStatus = tribe.diplomacy[otherTribe.id]?.status;
    if (diplomaticStatus !== DiplomaticStatus.War) continue;
    
    // Check each garrison of the enemy tribe
    for (const [location, garrison] of Object.entries(otherTribe.garrisons)) {
      // Skip unexplored hexes
      if (!exploredHexes.has(location)) continue;
      
      // Skip if garrison is too strong
      const totalTroops = Object.values(tribe.garrisons).reduce((sum, g) => sum + g.troops, 0);
      if (garrison.troops > totalTroops * 0.7) continue;
      
      // Check if there's a path to this location
      const path = findPath(
        parseHexCoords(tribe.location),
        parseHexCoords(location),
        mapData
      );
      
      if (path) {
        targets.push(location);
      }
    }
  }
  
  // Sort by distance from tribe's location
  const tribeCoords = parseHexCoords(tribe.location);
  return targets.sort((a, b) => {
    const aCoords = parseHexCoords(a);
    const bCoords = parseHexCoords(b);
    const aDist = axialDistance(tribeCoords, aCoords);
    const bDist = axialDistance(tribeCoords, bCoords);
    return aDist - bDist;
  });
}

/**
 * Gets the coordinates of neighboring hexes
 */
function getNeighborCoords(q: number, r: number): string[] {
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];
  
  return directions.map(dir => {
    const nq = q + dir.q;
    const nr = r + dir.r;
    return formatHexCoords(nq, nr);
  });
}

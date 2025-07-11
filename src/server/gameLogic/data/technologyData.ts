import { Technology, TechnologyEffectType, TerrainType } from '../../../../lib/types';

// Define the available technologies
const TECHNOLOGIES: Technology[] = [
  {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Basic farming techniques to produce food more efficiently.',
    cost: { scrap: 15 },
    researchPoints: 20,
    requiredTroops: 5,
    prerequisites: [],
    effects: [
      {
        type: TechnologyEffectType.PassiveFoodGeneration,
        value: 10
      }
    ],
    icon: '🌾'
  },
  {
    id: 'scavenging',
    name: 'Scavenging Techniques',
    description: 'Improved methods for finding and salvaging useful materials.',
    cost: { scrap: 20 },
    researchPoints: 25,
    requiredTroops: 8,
    prerequisites: [],
    effects: [
      {
        type: TechnologyEffectType.ScavengeYieldBonus,
        value: 0.2,
        resource: 'Scrap'
      }
    ],
    icon: '🔍'
  },
  {
    id: 'weapon_smithing',
    name: 'Weapon Smithing',
    description: 'Advanced techniques for crafting more effective weapons.',
    cost: { scrap: 30 },
    researchPoints: 35,
    requiredTroops: 10,
    prerequisites: ['scavenging'],
    effects: [
      {
        type: TechnologyEffectType.CombatBonusAttack,
        value: 0.15
      }
    ],
    icon: '⚔️'
  },
  {
    id: 'fortification',
    name: 'Fortification',
    description: 'Techniques for building defensive structures and positions.',
    cost: { scrap: 25 },
    researchPoints: 30,
    requiredTroops: 12,
    prerequisites: ['scavenging'],
    effects: [
      {
        type: TechnologyEffectType.CombatBonusDefense,
        value: 0.2
      }
    ],
    icon: '🛡️'
  },
  {
    id: 'hunting',
    name: 'Hunting',
    description: 'Improved methods for hunting wasteland creatures for food.',
    cost: { scrap: 15 },
    researchPoints: 20,
    requiredTroops: 6,
    prerequisites: [],
    effects: [
      {
        type: TechnologyEffectType.ScavengeYieldBonus,
        value: 0.25,
        resource: 'Food'
      }
    ],
    icon: '🏹'
  },
  {
    id: 'advanced_agriculture',
    name: 'Advanced Agriculture',
    description: 'Sophisticated farming techniques adapted to wasteland conditions.',
    cost: { scrap: 40 },
    researchPoints: 45,
    requiredTroops: 15,
    prerequisites: ['agriculture'],
    effects: [
      {
        type: TechnologyEffectType.PassiveFoodGeneration,
        value: 20
      }
    ],
    icon: '🌱'
  },
  {
    id: 'wasteland_adaptation',
    name: 'Wasteland Adaptation',
    description: 'Techniques for surviving and thriving in harsh wasteland environments.',
    cost: { scrap: 35 },
    researchPoints: 40,
    requiredTroops: 12,
    prerequisites: ['hunting'],
    effects: [
      {
        type: TechnologyEffectType.MovementSpeedBonus,
        value: 0.2
      },
      {
        type: TechnologyEffectType.CombatBonusAttack,
        value: 0.1,
        terrain: TerrainType.Wasteland
      }
    ],
    icon: '☢️'
  },
  {
    id: 'arms_manufacturing',
    name: 'Arms Manufacturing',
    description: 'Mass production techniques for weapons.',
    cost: { scrap: 50 },
    researchPoints: 60,
    requiredTroops: 20,
    prerequisites: ['weapon_smithing', 'scavenging'],
    effects: [
      {
        type: TechnologyEffectType.ScavengeYieldBonus,
        value: 0.3,
        resource: 'Weapons'
      }
    ],
    icon: '🔫'
  }
];

/**
 * Retrieves technology data by ID
 * @param id The technology ID to look up
 * @returns The technology object or undefined if not found
 */
export function getTechnology(id: string): Technology | undefined {
  return TECHNOLOGIES.find(tech => tech.id === id);
}

/**
 * Returns all available technologies
 * @returns Array of all technology objects
 */
export function getAllTechnologies(): Technology[] {
  return [...TECHNOLOGIES];
}

/**
 * Gets technologies that a tribe can research based on their completed techs
 * @param completedTechIds Array of completed technology IDs
 * @returns Array of available technologies
 */
export function getAvailableTechnologies(completedTechIds: string[]): Technology[] {
  return TECHNOLOGIES.filter(tech => {
    // Skip already completed techs
    if (completedTechIds.includes(tech.id)) return false;
    
    // Check if all prerequisites are met
    return tech.prerequisites.every(prereqId => completedTechIds.includes(prereqId));
  });
}

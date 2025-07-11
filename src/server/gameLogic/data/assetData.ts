import { GameAsset, TechnologyEffectType, TerrainType } from '../../../../lib/types';

// Define the available game assets
export const ALL_ASSETS: GameAsset[] = [
  {
    name: 'Ancient Farming Tools',
    description: 'Pre-war agricultural tools that significantly improve food production.',
    key_image_url: '/assets/items/farming_tools.png',
    effects: [
      {
        type: TechnologyEffectType.PassiveFoodGeneration,
        value: 15
      }
    ]
  },
  {
    name: 'Scrap Detector',
    description: 'A modified pre-war metal detector that helps locate valuable scrap.',
    key_image_url: '/assets/items/scrap_detector.png',
    effects: [
      {
        type: TechnologyEffectType.ScavengeYieldBonus,
        value: 0.25,
        resource: 'Scrap'
      }
    ]
  },
  {
    name: 'Tactical Combat Manual',
    description: 'A military handbook with combat strategies that improve fighting effectiveness.',
    key_image_url: '/assets/items/combat_manual.png',
    effects: [
      {
        type: TechnologyEffectType.CombatBonusAttack,
        value: 0.2
      }
    ]
  },
  {
    name: 'Reinforced Barricade Plans',
    description: 'Technical drawings for constructing superior defensive structures.',
    key_image_url: '/assets/items/barricade_plans.png',
    effects: [
      {
        type: TechnologyEffectType.CombatBonusDefense,
        value: 0.25
      }
    ]
  },
  {
    name: 'Wasteland Survival Guide',
    description: 'A comprehensive guide to surviving in radiation zones.',
    key_image_url: '/assets/items/survival_guide.png',
    effects: [
      {
        type: TechnologyEffectType.CombatBonusDefense,
        value: 0.15,
        terrain: TerrainType.Radiation
      },
      {
        type: TechnologyEffectType.MovementSpeedBonus,
        value: 0.1
      }
    ]
  },
  {
    name: 'Hunting Rifle Schematics',
    description: 'Detailed plans for crafting accurate long-range weapons.',
    key_image_url: '/assets/items/rifle_schematics.png',
    effects: [
      {
        type: TechnologyEffectType.ScavengeYieldBonus,
        value: 0.2,
        resource: 'Food'
      },
      {
        type: TechnologyEffectType.CombatBonusAttack,
        value: 0.1
      }
    ]
  },
  {
    name: 'Water Purification System',
    description: 'A device that makes contaminated water safe to drink, improving tribe health.',
    key_image_url: '/assets/items/water_purifier.png',
    effects: [
      {
        type: TechnologyEffectType.PassiveFoodGeneration,
        value: 10
      },
      {
        type: TechnologyEffectType.CombatBonusDefense,
        value: 0.1
      }
    ]
  },
  {
    name: 'Mountain Climbing Gear',
    description: 'Equipment that makes traversing mountainous terrain much easier.',
    key_image_url: '/assets/items/climbing_gear.png',
    effects: [
      {
        type: TechnologyEffectType.MovementSpeedBonus,
        value: 0.3,
        terrain: TerrainType.Mountains
      }
    ]
  },
  {
    name: 'Automated Defense Turret',
    description: 'A salvaged security turret that can be deployed to protect outposts.',
    key_image_url: '/assets/items/defense_turret.png',
    effects: [
      {
        type: TechnologyEffectType.CombatBonusDefense,
        value: 0.35
      }
    ]
  },
  {
    name: 'Salvaged Radio Network',
    description: 'A communications system that allows coordination across long distances.',
    key_image_url: '/assets/items/radio_network.png',
    effects: [
      {
        type: TechnologyEffectType.MovementSpeedBonus,
        value: 0.15
      },
      {
        type: TechnologyEffectType.CombatBonusAttack,
        value: 0.1
      }
    ]
  },
  {
    name: 'Ancient Weapon Cache',
    description: 'A stockpile of pre-war weapons in good condition.',
    key_image_url: '/assets/items/weapon_cache.png',
    effects: [
      {
        type: TechnologyEffectType.ScavengeYieldBonus,
        value: 0.3,
        resource: 'Weapons'
      }
    ]
  },
  {
    name: 'Desert Survival Kit',
    description: 'Specialized equipment for surviving in harsh desert environments.',
    key_image_url: '/assets/items/desert_kit.png',
    effects: [
      {
        type: TechnologyEffectType.MovementSpeedBonus,
        value: 0.2,
        terrain: TerrainType.Desert
      },
      {
        type: TechnologyEffectType.CombatBonusAttack,
        value: 0.15,
        terrain: TerrainType.Desert
      }
    ]
  }
];

/**
 * Retrieves asset data by name
 * @param name The asset name to look up
 * @returns The asset object or undefined if not found
 */
export function getAsset(name: string): GameAsset | undefined {
  return ALL_ASSETS.find(asset => asset.name === name);
}

/**
 * Returns all available assets
 * @returns Array of all asset objects
 */
export function getAllAssets(): GameAsset[] {
  return [...ALL_ASSETS];
}

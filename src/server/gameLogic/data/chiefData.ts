import { Chief, TribeStats } from '../../../../lib/types';

// Define the available chiefs
export const ALL_CHIEFS: Chief[] = [
  {
    name: 'Karn the Scavenger',
    description: 'A resourceful survivor known for finding valuable scrap in the most unlikely places.',
    key_image_url: '/assets/chiefs/karn.png',
    stats: {
      charisma: 2,
      intelligence: 4,
      leadership: 3,
      strength: 3
    }
  },
  {
    name: 'Valeria the Hunter',
    description: 'An expert tracker and hunter who can find food in even the most barren wastelands.',
    key_image_url: '/assets/chiefs/valeria.png',
    stats: {
      charisma: 3,
      intelligence: 3,
      leadership: 2,
      strength: 4
    }
  },
  {
    name: 'Thorne the Warlord',
    description: 'A fearsome warrior who inspires both loyalty and terror in equal measure.',
    key_image_url: '/assets/chiefs/thorne.png',
    stats: {
      charisma: 3,
      intelligence: 2,
      leadership: 5,
      strength: 5
    }
  },
  {
    name: 'Sybil the Sage',
    description: 'A keeper of old-world knowledge and technology, invaluable for research and development.',
    key_image_url: '/assets/chiefs/sybil.png',
    stats: {
      charisma: 2,
      intelligence: 6,
      leadership: 3,
      strength: 1
    }
  },
  {
    name: 'Marcus the Diplomat',
    description: 'A charismatic negotiator who can forge alliances with even the most hostile tribes.',
    key_image_url: '/assets/chiefs/marcus.png',
    stats: {
      charisma: 6,
      intelligence: 4,
      leadership: 3,
      strength: 1
    }
  },
  {
    name: 'Rook the Tactician',
    description: 'A brilliant military strategist who can turn the tide of any battle.',
    key_image_url: '/assets/chiefs/rook.png',
    stats: {
      charisma: 2,
      intelligence: 5,
      leadership: 4,
      strength: 3
    }
  },
  {
    name: 'Zara the Healer',
    description: 'A skilled medic whose knowledge of herbs and medicine keeps troops fighting longer.',
    key_image_url: '/assets/chiefs/zara.png',
    stats: {
      charisma: 4,
      intelligence: 5,
      leadership: 2,
      strength: 1
    }
  },
  {
    name: 'Grim the Enforcer',
    description: 'A ruthless enforcer who maintains discipline through fear and respect.',
    key_image_url: '/assets/chiefs/grim.png',
    stats: {
      charisma: 1,
      intelligence: 2,
      leadership: 4,
      strength: 6
    }
  },
  {
    name: 'Echo the Scout',
    description: 'A stealthy scout who can move undetected through enemy territory.',
    key_image_url: '/assets/chiefs/echo.png',
    stats: {
      charisma: 2,
      intelligence: 4,
      leadership: 2,
      strength: 4
    }
  },
  {
    name: 'Nova the Engineer',
    description: 'A mechanical genius who can turn scrap into formidable weapons and tools.',
    key_image_url: '/assets/chiefs/nova.png',
    stats: {
      charisma: 2,
      intelligence: 6,
      leadership: 2,
      strength: 2
    }
  },
  {
    name: 'Orion the Pathfinder',
    description: 'An expert navigator who can find safe passages through the most dangerous terrain.',
    key_image_url: '/assets/chiefs/orion.png',
    stats: {
      charisma: 3,
      intelligence: 4,
      leadership: 3,
      strength: 3
    }
  },
  {
    name: 'Lyra the Beastmaster',
    description: 'A mysterious figure who has a supernatural connection with wasteland creatures.',
    key_image_url: '/assets/chiefs/lyra.png',
    stats: {
      charisma: 5,
      intelligence: 3,
      leadership: 3,
      strength: 3
    }
  }
];

/**
 * Retrieves chief data by name
 * @param name The chief name to look up
 * @returns The chief object or undefined if not found
 */
export function getChief(name: string): Chief | undefined {
  return ALL_CHIEFS.find(chief => chief.name === name);
}

/**
 * Returns all available chiefs
 * @returns Array of all chief objects
 */
export function getAllChiefs(): Chief[] {
  return [...ALL_CHIEFS];
}

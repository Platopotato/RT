import { HexData, TerrainType, POIType, MapSettings, POI, POIRarity } from '../../../lib/types';
import { formatHexCoords, axialDistance, getHexesInRange } from '../../../lib/mapUtils';
import { POI_RARITY_MAP } from '../../../lib/constants';
import { generateNoise } from './utils/noise';

/**
 * Generates a complete map with terrain, POIs, and starting locations
 * @param radius The radius of the map in hexes
 * @param seed A seed value for random generation
 * @param settings Map generation settings
 * @returns Object containing the map data and starting locations
 */
export function generateMapData(
  radius: number,
  seed: number = Date.now(),
  settings: MapSettings
): { map: HexData[]; startingLocations: string[] } {
  // Set up RNG with seed
  const rng = seedRandom(seed);
  
  // Generate base terrain
  const map = generateBaseMap(radius, rng, settings);
  
  // Add points of interest
  addPointsOfInterest(map, rng);
  
  // Determine good starting locations
  const startingLocations = findStartingLocations(map, radius, rng);
  
  return { map, startingLocations };
}

/**
 * Simple seeded random number generator
 */
function seedRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Generates the base terrain map
 */
function generateBaseMap(
  radius: number,
  rng: () => number,
  settings: MapSettings
): HexData[] {
  const map: HexData[] = [];
  const noiseScale = 0.1;
  const noiseSeed = Math.floor(rng() * 10000);
  
  // Generate simplex noise for terrain distribution
  const noise1 = generateNoise(noiseSeed);
  const noise2 = generateNoise(noiseSeed + 10000);
  
  // Terrain distribution weights from settings
  const terrainBiases = settings.biases;
  
  // Calculate total weight for normalization
  const totalWeight = Object.values(terrainBiases).reduce((sum, weight) => sum + weight, 0);
  
  // Create a weighted array of terrain types for random selection
  const terrainTypes: TerrainType[] = [];
  for (const [terrain, weight] of Object.entries(terrainBiases)) {
    const count = Math.floor((weight / totalWeight) * 1000);
    for (let i = 0; i < count; i++) {
      terrainTypes.push(terrain as TerrainType);
    }
  }
  
  // Generate hexes within radius
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      // Skip if outside the circular map boundary
      if (axialDistance({ q: 0, r: 0 }, { q, r }) > radius) continue;
      
      // Use noise to determine terrain type
      const noiseValue1 = noise1(q * noiseScale, r * noiseScale);
      const noiseValue2 = noise2(q * noiseScale, r * noiseScale);
      const combinedNoise = (noiseValue1 + noiseValue2) / 2;
      
      // Determine terrain type based on noise and biases
      let terrain: TerrainType;
      
      // Use noise value to select terrain with some randomness
      if (combinedNoise < -0.5) {
        // More likely to be water or swamp
        terrain = rng() < 0.7 ? TerrainType.Water : TerrainType.Swamp;
      } else if (combinedNoise < -0.2) {
        // More likely to be forest or swamp
        terrain = rng() < 0.6 ? TerrainType.Forest : TerrainType.Swamp;
      } else if (combinedNoise < 0.2) {
        // Plains or common terrain
        terrain = rng() < 0.8 ? TerrainType.Plains : terrainTypes[Math.floor(rng() * terrainTypes.length)];
      } else if (combinedNoise < 0.5) {
        // Hills, desert, or wasteland
        terrain = rng() < 0.6 ? TerrainType.Wasteland : TerrainType.Desert;
      } else {
        // Mountains or special terrain
        terrain = rng() < 0.7 ? TerrainType.Mountains : 
                 rng() < 0.5 ? TerrainType.Radiation : TerrainType.Crater;
      }
      
      // Add hex to map
      map.push({ q, r, terrain });
    }
  }
  
  // Add some ruins and special features
  const ruinsCount = Math.floor(map.length * 0.05); // 5% of hexes are ruins
  for (let i = 0; i < ruinsCount; i++) {
    const index = Math.floor(rng() * map.length);
    if (map[index].terrain !== TerrainType.Water) {
      map[index].terrain = TerrainType.Ruins;
    }
  }
  
  return map;
}

/**
 * Add points of interest to the map
 */
function addPointsOfInterest(map: HexData[], rng: () => number): void {
  // Define POI distribution
  const poiDistribution: { type: POIType; count: number }[] = [
    { type: POIType.Scrapyard, count: 12 },
    { type: POIType.FoodSource, count: 15 },
    { type: POIType.WeaponsCache, count: 8 },
    { type: POIType.ResearchLab, count: 5 },
    { type: POIType.Settlement, count: 6 },
    { type: POIType.Ruins, count: 10 },
    { type: POIType.BanditCamp, count: 7 },
    { type: POIType.Mine, count: 4 },
    { type: POIType.Vault, count: 2 },
    { type: POIType.Battlefield, count: 3 },
    { type: POIType.Factory, count: 4 },
    { type: POIType.Crater, count: 3 },
    { type: POIType.Radiation, count: 2 }
  ];
  
  // Terrain compatibility for POIs
  const terrainCompatibility: { [key in POIType]?: TerrainType[] } = {
    [POIType.Scrapyard]: [TerrainType.Plains, TerrainType.Wasteland, TerrainType.Ruins],
    [POIType.FoodSource]: [TerrainType.Plains, TerrainType.Forest, TerrainType.Swamp],
    [POIType.WeaponsCache]: [TerrainType.Ruins, TerrainType.Mountains, TerrainType.Wasteland],
    [POIType.ResearchLab]: [TerrainType.Ruins, TerrainType.Plains],
    [POIType.Settlement]: [TerrainType.Plains, TerrainType.Forest],
    [POIType.Ruins]: [TerrainType.Ruins],
    [POIType.BanditCamp]: [TerrainType.Wasteland, TerrainType.Desert, TerrainType.Mountains],
    [POIType.Mine]: [TerrainType.Mountains],
    [POIType.Vault]: [TerrainType.Ruins, TerrainType.Mountains],
    [POIType.Battlefield]: [TerrainType.Plains, TerrainType.Wasteland],
    [POIType.Factory]: [TerrainType.Ruins, TerrainType.Plains],
    [POIType.Crater]: [TerrainType.Crater],
    [POIType.Radiation]: [TerrainType.Radiation]
  };
  
  // Place POIs
  for (const { type, count } of poiDistribution) {
    const compatibleTerrain = terrainCompatibility[type] || [
      TerrainType.Plains, 
      TerrainType.Desert, 
      TerrainType.Mountains, 
      TerrainType.Forest, 
      TerrainType.Ruins, 
      TerrainType.Wasteland
    ];
    
    // Find suitable hexes
    const suitableHexes = map.filter(hex => 
      compatibleTerrain.includes(hex.terrain) && !hex.poi
    );
    
    if (suitableHexes.length === 0) continue;
    
    // Place POIs
    for (let i = 0; i < count && suitableHexes.length > 0; i++) {
      const index = Math.floor(rng() * suitableHexes.length);
      const hex = suitableHexes[index];
      
      // Create POI
      const poi: POI = {
        id: `poi-${type}-${formatHexCoords(hex.q, hex.r)}`,
        type,
        difficulty: Math.floor(rng() * 10) + 1, // 1-10
        rarity: POI_RARITY_MAP[type]
      };
      
      // Find the hex in the original map and add the POI
      const mapIndex = map.findIndex(h => h.q === hex.q && h.r === hex.r);
      if (mapIndex !== -1) {
        map[mapIndex].poi = poi;
      }
      
      // Remove this hex from suitable hexes
      suitableHexes.splice(index, 1);
    }
  }
}

/**
 * Find suitable starting locations for tribes
 */
function findStartingLocations(map: HexData[], radius: number, rng: () => number): string[] {
  const startingLocations: string[] = [];
  const maxStartingLocations = 16; // Maximum number of starting locations
  
  // Criteria for starting locations
  const suitableTerrain = [TerrainType.Plains, TerrainType.Forest];
  const minDistanceFromCenter = radius * 0.3; // Not too close to center
  const maxDistanceFromCenter = radius * 0.8; // Not too close to edge
  const minDistanceBetweenStarts = radius * 0.25; // Spread out starts
  
  // Filter suitable hexes
  const suitableHexes = map.filter(hex => {
    const distance = axialDistance({ q: 0, r: 0 }, { q: hex.q, r: hex.r });
    return (
      suitableTerrain.includes(hex.terrain) &&
      distance >= minDistanceFromCenter &&
      distance <= maxDistanceFromCenter &&
      !hex.poi
    );
  });
  
  // Shuffle suitable hexes
  const shuffledHexes = [...suitableHexes].sort(() => rng() - 0.5);
  
  // Select starting locations
  for (const hex of shuffledHexes) {
    const coordStr = formatHexCoords(hex.q, hex.r);
    
    // Check if this location is far enough from existing starting locations
    const isFarEnough = startingLocations.every(existingLoc => {
      const { q: q2, r: r2 } = parseHexCoords(existingLoc);
      return axialDistance({ q: hex.q, r: hex.r }, { q: q2, r: r2 }) >= minDistanceBetweenStarts;
    });
    
    if (isFarEnough) {
      startingLocations.push(coordStr);
      
      // Check if we have enough starting locations
      if (startingLocations.length >= maxStartingLocations) {
        break;
      }
    }
  }
  
  return startingLocations;
}

/**
 * Parse hex coordinates from string format
 */
function parseHexCoords(hexString: string): { q: number; r: number } {
  const [qStr, rStr] = hexString.split('.');
  return {
    q: parseInt(qStr, 10),
    r: parseInt(rStr, 10)
  };
}

import { HexData, TerrainType } from './types';

/**
 * Converts a hex coordinate string (e.g., "050.050") to an object with q and r properties.
 */
export function parseHexCoords(hexString: string): { q: number; r: number } {
  const [qStr, rStr] = hexString.split('.');
  return {
    q: parseInt(qStr, 10),
    r: parseInt(rStr, 10)
  };
}

/**
 * Formats q and r coordinates into a string representation (e.g., "050.050").
 */
export function formatHexCoords(q: number, r: number): string {
  // Ensure coordinates are padded to 3 digits
  const qStr = q.toString().padStart(3, '0');
  const rStr = r.toString().padStart(3, '0');
  return `${qStr}.${rStr}`;
}

/**
 * Calculates the axial distance between two hex coordinates.
 */
export function axialDistance(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/**
 * Returns all hex coordinates within a specified range of a center hex.
 */
export function getHexesInRange(center: { q: number; r: number }, range: number): string[] {
  const results: string[] = [];
  for (let q = center.q - range; q <= center.q + range; q++) {
    for (let r = center.r - range; r <= center.r + range; r++) {
      if (axialDistance({ q, r }, center) <= range) {
        results.push(formatHexCoords(q, r));
      }
    }
  }
  return results;
}

/**
 * Returns the neighboring hex coordinates for a given hex.
 */
export function getNeighbors(hex: { q: number; r: number }): { q: number; r: number }[] {
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
  ];
  
  return directions.map(dir => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r
  }));
}

/**
 * Finds the shortest path between two hexes using A* pathfinding algorithm.
 * Returns the path and total cost if a path is found, or null if no path exists.
 */
export function findPath(
  start: { q: number; r: number },
  goal: { q: number; r: number },
  mapData: HexData[]
): { path: string[]; cost: number } | null {
  // Create a map for quick lookup of terrain by coordinates
  const terrainMap = new Map<string, TerrainType>();
  mapData.forEach(hex => {
    terrainMap.set(formatHexCoords(hex.q, hex.r), hex.terrain);
  });

  // Terrain movement costs
  const terrainCosts: { [key in TerrainType]: number } = {
    [TerrainType.Plains]: 1,
    [TerrainType.Desert]: 1.5,
    [TerrainType.Mountains]: 3,
    [TerrainType.Forest]: 1.5,
    [TerrainType.Ruins]: 1.5,
    [TerrainType.Wasteland]: 2,
    [TerrainType.Water]: 5,
    [TerrainType.Radiation]: 4,
    [TerrainType.Crater]: 2,
    [TerrainType.Swamp]: 2.5
  };

  // Heuristic function (estimated cost to goal)
  const heuristic = (a: { q: number; r: number }) => axialDistance(a, goal);

  // Initialize data structures
  const openSet = new Set<string>();
  const closedSet = new Set<string>();
  const startKey = formatHexCoords(start.q, start.r);
  openSet.add(startKey);

  // Track g-scores (cost from start) and f-scores (g-score + heuristic)
  const gScore: { [key: string]: number } = { [startKey]: 0 };
  const fScore: { [key: string]: number } = { [startKey]: heuristic(start) };

  // Track how we got to each node
  const cameFrom: { [key: string]: string } = {};

  while (openSet.size > 0) {
    // Find node with lowest f-score
    let current = '';
    let lowestFScore = Infinity;
    
    for (const key of openSet) {
      if (fScore[key] < lowestFScore) {
        lowestFScore = fScore[key];
        current = key;
      }
    }

    // If we've reached the goal, reconstruct and return the path
    if (current === formatHexCoords(goal.q, goal.r)) {
      const path: string[] = [current];
      let totalCost = gScore[current];
      
      while (cameFrom[current]) {
        current = cameFrom[current];
        path.unshift(current);
      }
      
      return { path, cost: Math.ceil(totalCost) };
    }

    // Move current node from open to closed set
    openSet.delete(current);
    closedSet.add(current);

    // Get the current node's coordinates
    const currentCoords = parseHexCoords(current);
    
    // Check all neighbors
    for (const neighbor of getNeighbors(currentCoords)) {
      const neighborKey = formatHexCoords(neighbor.q, neighbor.r);
      
      // Skip if already evaluated or not on the map
      if (closedSet.has(neighborKey) || !terrainMap.has(neighborKey)) {
        continue;
      }

      const terrainType = terrainMap.get(neighborKey)!;
      const movementCost = terrainCosts[terrainType];
      
      // Skip impassable terrain (optional, depends on game rules)
      if (movementCost >= 10) {
        continue;
      }

      // Calculate tentative g-score
      const tentativeGScore = gScore[current] + movementCost;
      
      // Add to open set if not already there
      if (!openSet.has(neighborKey)) {
        openSet.add(neighborKey);
      } else if (tentativeGScore >= (gScore[neighborKey] || Infinity)) {
        // Not a better path
        continue;
      }

      // This is the best path so far, record it
      cameFrom[neighborKey] = current;
      gScore[neighborKey] = tentativeGScore;
      fScore[neighborKey] = tentativeGScore + heuristic(neighbor);
    }
  }

  // No path found
  return null;
}

/**
 * Checks if a coordinate is within the map boundaries.
 */
export function isWithinMapBounds(coords: { q: number; r: number }, radius: number): boolean {
  return axialDistance({ q: 0, r: 0 }, coords) <= radius;
}

/**
 * Converts pixel coordinates to hex coordinates.
 * Useful for handling mouse events on the map.
 */
export function pixelToHex(x: number, y: number, size: number, offsetX: number, offsetY: number): { q: number; r: number } {
  // Adjust for offset
  const adjustedX = (x - offsetX) / size;
  const adjustedY = (y - offsetY) / size;
  
  // Convert to axial coordinates
  const q = (Math.sqrt(3) / 3 * adjustedX - 1/3 * adjustedY);
  const r = (2/3 * adjustedY);
  
  // Round to nearest hex
  return hexRound(q, r);
}

/**
 * Rounds floating point hex coordinates to the nearest hex.
 */
function hexRound(q: number, r: number): { q: number; r: number } {
  let s = -q - r;
  
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }
  
  return { q: rq, r: rr };
}

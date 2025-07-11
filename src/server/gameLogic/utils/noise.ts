/**
 * A simplified implementation of noise generation for map creation
 * Based on a simplified version of Perlin noise concepts
 */

// Constants for the noise algorithm
const PERMUTATION = new Array(512);
const GRADIENT = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1]
];

/**
 * Creates a noise generator function with the given seed
 * @param seed A number to seed the random number generator
 * @returns A function that generates noise values for coordinates
 */
export function generateNoise(seed: number): (x: number, y: number) => number {
  // Initialize the permutation table with the seed
  initPermutation(seed);
  
  /**
   * Generates a noise value for the given coordinates
   * @param x The x coordinate
   * @param y The y coordinate
   * @returns A noise value between -1 and 1
   */
  return function noise(x: number, y: number): number {
    // Scale inputs for better visual results
    x = x || 0;
    y = y || 0;
    
    // Calculate grid cell coordinates
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    
    // Calculate relative position within grid cell
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    // Get gradient indices
    const gi00 = PERMUTATION[(xi + PERMUTATION[yi & 255]) & 255] % 8;
    const gi01 = PERMUTATION[(xi + PERMUTATION[(yi + 1) & 255]) & 255] % 8;
    const gi10 = PERMUTATION[((xi + 1) + PERMUTATION[yi & 255]) & 255] % 8;
    const gi11 = PERMUTATION[((xi + 1) + PERMUTATION[(yi + 1) & 255]) & 255] % 8;
    
    // Calculate dot products
    const dp00 = dot(GRADIENT[gi00], [xf, yf]);
    const dp01 = dot(GRADIENT[gi01], [xf, yf - 1]);
    const dp10 = dot(GRADIENT[gi10], [xf - 1, yf]);
    const dp11 = dot(GRADIENT[gi11], [xf - 1, yf - 1]);
    
    // Interpolation weights with smoothing
    const u = smootherstep(xf);
    const v = smootherstep(yf);
    
    // Bilinear interpolation
    const x1 = lerp(dp00, dp10, u);
    const x2 = lerp(dp01, dp11, u);
    const result = lerp(x1, x2, v);
    
    // Scale to [-1, 1] range
    return result;
  };
}

/**
 * Initializes the permutation table with the given seed
 */
function initPermutation(seed: number): void {
  // Simple seeded random number generator
  const random = (() => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  })();
  
  // Fill permutation table with ordered values
  for (let i = 0; i < 256; i++) {
    PERMUTATION[i] = i;
  }
  
  // Shuffle permutation table
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [PERMUTATION[i], PERMUTATION[j]] = [PERMUTATION[j], PERMUTATION[i]];
  }
  
  // Duplicate the permutation table
  for (let i = 0; i < 256; i++) {
    PERMUTATION[i + 256] = PERMUTATION[i];
  }
}

/**
 * Calculates the dot product of two vectors
 */
function dot(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1];
}

/**
 * Linear interpolation between a and b by t
 */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * Smootherstep function for smoother interpolation
 * Improved version of the classic smoothstep function
 */
function smootherstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Generates a 2D noise map for the given dimensions
 * Useful for generating complete noise maps for testing
 * 
 * @param width The width of the noise map
 * @param height The height of the noise map
 * @param scale The scale of the noise (lower values = more zoomed out)
 * @param seed The seed for the noise generator
 * @returns A 2D array of noise values
 */
export function generateNoiseMap(
  width: number,
  height: number,
  scale: number = 0.1,
  seed: number = Date.now()
): number[][] {
  const noiseFunc = generateNoise(seed);
  const map: number[][] = [];
  
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      // Generate noise at scaled coordinates
      const value = noiseFunc(x * scale, y * scale);
      row.push(value);
    }
    map.push(row);
  }
  
  return map;
}

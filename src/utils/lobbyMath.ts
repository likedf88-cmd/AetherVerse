/**
 * 3D Lobby Math, Movement Physics & Proximity Calculations
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface LobbyBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floorY: number;
}

export const DEFAULT_LOBBY_BOUNDS: LobbyBounds = {
  minX: -45,
  maxX: 45,
  minZ: -45,
  maxZ: 45,
  floorY: 0,
};

/**
 * Clamps player coordinates within playable lobby bounds to prevent falling into the void.
 */
export function clampToLobbyBounds(
  pos: Vector3D,
  bounds: LobbyBounds = DEFAULT_LOBBY_BOUNDS
): Vector3D {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
    y: Math.max(bounds.floorY, pos.y),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, pos.z)),
  };
}

/**
 * Calculates Euclidean distance between two 3D positions in the metaverse.
 */
export function distance3D(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates audio falloff volume (0.0 to 1.0) based on distance from music source.
 */
export function calculateMusicVolumeByDistance(
  listenerPos: Vector3D,
  sourcePos: Vector3D,
  maxRadius: number = 25
): number {
  const dist = distance3D(listenerPos, sourcePos);
  if (dist >= maxRadius) return 0;
  const normalized = 1 - dist / maxRadius;
  return Math.max(0, Math.min(1, normalized * normalized));
}

/**
 * Checks if another player is within chat bubble hearing range (default 18 meters).
 */
export function isWithinChatRange(
  playerA: Vector3D,
  playerB: Vector3D,
  radius: number = 18
): boolean {
  return distance3D(playerA, playerB) <= radius;
}

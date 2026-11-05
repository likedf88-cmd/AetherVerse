import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampToLobbyBounds,
  distance3D,
  calculateMusicVolumeByDistance,
  isWithinChatRange
} from './lobbyMath';

test('clampToLobbyBounds keeps player inside arena boundaries', () => {
  const inside = clampToLobbyBounds({ x: 10, y: 0, z: -15 });
  assert.deepEqual(inside, { x: 10, y: 0, z: -15 });

  const clamped = clampToLobbyBounds({ x: 99, y: -5, z: -80 });
  assert.equal(clamped.x, 45);
  assert.equal(clamped.y, 0);
  assert.equal(clamped.z, -45);
});

test('distance3D computes geometric distance', () => {
  const d = distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
  assert.equal(d, 5);
});

test('calculateMusicVolumeByDistance falls off smoothly', () => {
  const center = { x: 0, y: 0, z: 0 };
  const rightNextTo = calculateMusicVolumeByDistance({ x: 0, y: 0, z: 0 }, center, 20);
  assert.equal(rightNextTo, 1.0);

  const farAway = calculateMusicVolumeByDistance({ x: 25, y: 0, z: 0 }, center, 20);
  assert.equal(farAway, 0.0);
});

test('isWithinChatRange filters players outside proximity radius', () => {
  const p1 = { x: 0, y: 0, z: 0 };
  const p2 = { x: 5, y: 0, z: 5 }; // dist ~ 7.07
  const p3 = { x: 30, y: 0, z: 30 }; // dist ~ 42.4

  assert.equal(isWithinChatRange(p1, p2, 15), true);
  assert.equal(isWithinChatRange(p1, p3, 15), false);
});

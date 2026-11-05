import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapRawBoneToStandard,
  calculateVertexSkinWeights,
  validateEmoteWheelConfiguration,
  calculateWeightHeatColor
} from './riggingMath';

test('calculateWeightHeatColor maps weights to standard heat-map colors', () => {
  const zero = calculateWeightHeatColor(0.0);
  assert.equal(zero.r, 0);
  assert.equal(zero.b, 1); // Blue for 0 weight

  const mid = calculateWeightHeatColor(0.5);
  assert.equal(mid.g, 1);
  assert.equal(mid.b, 0); // Green for 0.5 weight

  const max = calculateWeightHeatColor(1.0);
  assert.equal(max.r, 1);
  assert.equal(max.b, 0); // Red for 1.0 weight
});

test('mapRawBoneToStandard maps various naming conventions accurately', () => {
  // Mixamo names
  assert.equal(mapRawBoneToStandard('mixamorig:Hips'), 'hips');
  assert.equal(mapRawBoneToStandard('mixamorig:Spine1'), 'chest');
  assert.equal(mapRawBoneToStandard('mixamorig:LeftArm'), 'leftUpperArm');
  assert.equal(mapRawBoneToStandard('mixamorig:RightForeArm'), 'rightForearm');
  assert.equal(mapRawBoneToStandard('mixamorig:LeftUpLeg'), 'leftUpperLeg');
  assert.equal(mapRawBoneToStandard('mixamorig:RightLeg'), 'rightLowerLeg');

  // Unreal / Biped names
  assert.equal(mapRawBoneToStandard('Bip01_Pelvis'), 'hips');
  assert.equal(mapRawBoneToStandard('Bip01_Head'), 'head');
  assert.equal(mapRawBoneToStandard('upperarm_l'), 'leftUpperArm');
  assert.equal(mapRawBoneToStandard('calf_r'), 'rightLowerLeg');

  // Unknown bone
  assert.equal(mapRawBoneToStandard('RandomCameraLocator'), null);
});

test('calculateVertexSkinWeights allocates correct bone groups by geometry coordinate', () => {
  // Top of head (yNorm = 0.95)
  const headVert = calculateVertexSkinWeights(0.95, 0, 0);
  assert.equal(headVert.primaryBoneIndex, 4); // Head
  assert.ok(headVert.primaryWeight > 0.6);

  // Left hand (xNorm = 0.75, yNorm = 0.6)
  const handVert = calculateVertexSkinWeights(0.6, 0.75, 0);
  assert.equal(handVert.primaryBoneIndex, 7); // Left Hand

  // Right foot (xNorm = -0.15, yNorm = 0.03)
  const footVert = calculateVertexSkinWeights(0.03, -0.15, 0);
  assert.equal(footVert.primaryBoneIndex, 16); // Right Foot

  // Hips / Pelvis center (yNorm = 0.48, xNorm = 0.0)
  const hipsVert = calculateVertexSkinWeights(0.48, 0, 0);
  assert.equal(hipsVert.primaryBoneIndex, 0); // Hips
});

test('validateEmoteWheelConfiguration enforces limits, uniqueness, and ownership', () => {
  const owned = ['emote_dance', 'emote_wave', 'emote_backflip', 'emote_cheer', 'emote_floss'];

  // Valid 4-slot loadout
  const valid = validateEmoteWheelConfiguration(
    ['emote_dance', 'emote_wave', 'emote_backflip'],
    owned,
    6
  );
  assert.equal(valid.valid, true);
  assert.equal(valid.validatedSlots.length, 3);

  // Exceeding maximum 6 slots
  const exceed = validateEmoteWheelConfiguration(
    ['1', '2', '3', '4', '5', '6', '7'],
    ['1', '2', '3', '4', '5', '6', '7'],
    6
  );
  assert.equal(exceed.valid, false);

  // Duplicate slots
  const dup = validateEmoteWheelConfiguration(
    ['emote_dance', 'emote_dance'],
    owned,
    6
  );
  assert.equal(dup.valid, false);

  // Unowned emote
  const unowned = validateEmoteWheelConfiguration(
    ['emote_dance', 'unowned_legendary_dance'],
    owned,
    6
  );
  assert.equal(unowned.valid, false);
});

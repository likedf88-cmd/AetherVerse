/**
 * Unit tests for AvatarEngineService
 * Tests binary GLB header validation, error states, Mixamo landmark configuration,
 * and multi-stage rigging pipeline progress.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { AvatarEngineService } from './avatarEngine';

test('AvatarEngineService - validateGlbBuffer validates binary GLB container', () => {
  const engine = new AvatarEngineService();

  // Construct a minimal valid GLB 2.0 binary header
  // 12-byte header: magic (0x46546C67), version (2), length (36)
  // chunk 0: chunkLength (16), chunkType (0x4E4F534A 'JSON')
  const jsonContent = JSON.stringify({ asset: { version: '2.0' }, meshes: [{ name: 'mesh1' }] });
  const jsonBytes = Buffer.from(jsonContent, 'utf-8');
  // Pad to 4-byte boundary
  const paddedLength = Math.ceil(jsonBytes.length / 4) * 4;
  const chunkData = Buffer.alloc(paddedLength, 0x20); // space padded
  jsonBytes.copy(chunkData);

  const totalLength = 12 + 8 + paddedLength;
  const buffer = Buffer.alloc(totalLength);

  // Header
  buffer.writeUInt32LE(0x46546C67, 0); // magic
  buffer.writeUInt32LE(2, 4);          // version
  buffer.writeUInt32LE(totalLength, 8);// length

  // Chunk 0
  buffer.writeUInt32LE(paddedLength, 12); // chunkLength
  buffer.writeUInt32LE(0x4E4F534A, 16);  // chunkType JSON
  chunkData.copy(buffer, 20);

  const result = engine.validateGlbBuffer(buffer);
  assert.equal(result.isValid, true);
  assert.equal(result.format, 'glb');
  assert.equal(result.meshCount, 1);
  assert.equal(result.hasSkeleton, false);
});

test('AvatarEngineService - validateGlbBuffer rejects corrupt or non-GLB files', () => {
  const engine = new AvatarEngineService();

  // Invalid magic bytes
  const badBuffer = Buffer.alloc(32);
  badBuffer.writeUInt32LE(0xDEADBEEF, 0);

  const result = engine.validateGlbBuffer(badBuffer);
  assert.equal(result.isValid, false);
  assert.match(result.error || '', /Invalid GLB magic header/);

  // File too small
  const smallBuffer = Buffer.alloc(8);
  const smallResult = engine.validateGlbBuffer(smallBuffer);
  assert.equal(smallResult.isValid, false);
  assert.match(smallResult.error || '', /File too small/);
});

test('AvatarEngineService - creates job and updates Mixamo landmarks', () => {
  const engine = new AvatarEngineService();

  const validation = {
    isValid: true,
    format: 'glb' as const,
    meshCount: 3,
    materialCount: 2,
    textureCount: 4,
    hasSkeleton: false,
    boneCount: 0,
    detectedBones: [],
    animationCount: 0,
    vertexCountEstimate: 16500
  };

  const job = engine.createJob('character_model.glb', 15000000, validation);
  assert.ok(job.id.startsWith('job_rig_'));
  assert.equal(job.fileName, 'character_model.glb');
  assert.equal(job.status, 'analyzing');
  assert.equal(job.riggingMethod, 'mixamo_guided');
  assert.ok(job.mixamoConfig?.landmarks.chin);

  // Customize landmark
  const updated = engine.updateJobLandmarks(job.id, {
    chin: { x: 0, y: 1.70, z: 0.1 }
  });
  assert.equal(updated.mixamoConfig?.landmarks.chin.y, 1.70);
});

test('AvatarEngineService - approveJob sets status to published', () => {
  const engine = new AvatarEngineService();
  const allJobs = engine.getAllJobs();
  const readyJob = allJobs.find(j => j.status === 'ready_for_approval');
  assert.ok(readyJob);

  const approved = engine.approveJob(readyJob.id);
  assert.equal(approved.success, true);
  assert.equal(approved.job.status, 'published');
});

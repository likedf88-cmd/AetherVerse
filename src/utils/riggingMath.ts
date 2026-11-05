/**
 * Universal Humanoid Rigging, Bone Mapping & Emote Wheel Mathematics
 * Handles bone retargeting alias maps, vertex height-based automatic skin weighting,
 * and server-authoritative emote wheel validation.
 */

export const STANDARD_HUMANOID_BONES = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftShoulder',
  'rightShoulder',
  'leftUpperArm',
  'rightUpperArm',
  'leftForearm',
  'rightForearm',
  'leftHand',
  'rightHand',
  'leftUpperLeg',
  'rightUpperLeg',
  'leftLowerLeg',
  'rightLowerLeg',
  'leftFoot',
  'rightFoot'
] as const;

export type StandardBoneName = typeof STANDARD_HUMANOID_BONES[number];

/**
 * Common bone alias map covering Mixamo, VRM, Ready Player Me, Unreal, and Blender conventions.
 */
export const BONE_ALIASES: Record<StandardBoneName, string[]> = {
  hips: ['hips', 'mixamorig:hips', 'mixamorighips', 'pelvis', 'root_pelvis', 'bip01_pelvis'],
  spine: ['spine', 'mixamorig:spine', 'mixamorigspine', 'spine1', 'bip01_spine'],
  chest: ['chest', 'mixamorig:spine1', 'mixamorigspine1', 'spine2', 'bip01_spine1'],
  upperChest: ['upperchest', 'mixamorig:spine2', 'mixamorigspine2', 'spine3', 'bip01_spine2'],
  neck: ['neck', 'mixamorig:neck', 'mixamorigneck', 'bip01_neck'],
  head: ['head', 'mixamorig:head', 'mixamorighead', 'bip01_head'],
  leftShoulder: ['leftshoulder', 'mixamorig:leftshoulder', 'mixamorigleftshoulder', 'clavicle_l', 'l_clavicle', 'bip01_l_clavicle'],
  rightShoulder: ['rightshoulder', 'mixamorig:rightshoulder', 'mixamorigrightshoulder', 'clavicle_r', 'r_clavicle', 'bip01_r_clavicle'],
  leftUpperArm: ['leftupperarm', 'mixamorig:leftarm', 'mixamorigleftarm', 'upperarm_l', 'l_upperarm', 'bip01_l_upperarm'],
  rightUpperArm: ['rightupperarm', 'mixamorig:rightarm', 'mixamorigrightarm', 'upperarm_r', 'r_upperarm', 'bip01_r_upperarm'],
  leftForearm: ['leftforearm', 'mixamorig:leftforearm', 'mixamorigleftforearm', 'lowerarm_l', 'l_forearm', 'bip01_l_forearm'],
  rightForearm: ['rightforearm', 'mixamorig:rightforearm', 'mixamorigrightforearm', 'lowerarm_r', 'r_forearm', 'bip01_r_forearm'],
  leftHand: ['lefthand', 'mixamorig:lefthand', 'mixamoriglefthand', 'hand_l', 'l_hand', 'bip01_l_hand'],
  rightHand: ['righthand', 'mixamorig:righthand', 'mixamorigrighthand', 'hand_r', 'r_hand', 'bip01_r_hand'],
  leftUpperLeg: ['leftupperleg', 'mixamorig:leftupleg', 'mixamorigleftupleg', 'thigh_l', 'l_thigh', 'bip01_l_thigh'],
  rightUpperLeg: ['rightupperleg', 'mixamorig:rightupleg', 'mixamorigrightupleg', 'thigh_r', 'r_thigh', 'bip01_r_thigh'],
  leftLowerLeg: ['leftlowerleg', 'mixamorig:leftleg', 'mixamorigleftleg', 'calf_l', 'l_calf', 'bip01_l_calf'],
  rightLowerLeg: ['rightlowerleg', 'mixamorig:rightleg', 'mixamorigrightleg', 'calf_r', 'r_calf', 'bip01_r_calf'],
  leftFoot: ['leftfoot', 'mixamorig:leftfoot', 'mixamorigleftfoot', 'foot_l', 'l_foot', 'bip01_l_foot'],
  rightFoot: ['rightfoot', 'mixamorig:rightfoot', 'mixamorigrightfoot', 'foot_r', 'r_foot', 'bip01_r_foot'],
};

/**
 * Matches an arbitrary raw bone name to the platform's standardized humanoid bone name.
 */
export function mapRawBoneToStandard(rawName: string): StandardBoneName | null {
  if (!rawName) return null;
  const clean = rawName.toLowerCase().replace(/[\s_:-]/g, '');

  // 1. First pass: exact normalized match
  for (const [standardName, aliases] of Object.entries(BONE_ALIASES)) {
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[\s_:-]/g, '');
      if (clean === cleanAlias) {
        return standardName as StandardBoneName;
      }
    }
  }

  // 2. Second pass: prefix / suffix match
  for (const [standardName, aliases] of Object.entries(BONE_ALIASES)) {
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[\s_:-]/g, '');
      if (clean.endsWith(cleanAlias) || clean.startsWith(cleanAlias)) {
        return standardName as StandardBoneName;
      }
    }
  }

  return null;
}

export interface HumanoidVertexAssignment {
  primaryBoneIndex: number;
  secondaryBoneIndex: number;
  primaryWeight: number;
  secondaryWeight: number;
}

/**
 * Calculates smooth humanoid skin weights based on normalized body coordinates.
 * Normalized inputs:
 *  - yNormalized: 0.0 (feet) to 1.0 (top of head)
 *  - xNormalized: lateral offset from centerline (-1.0 to +1.0)
 *  - zNormalized: depth offset
 */
export function calculateVertexSkinWeights(
  yNorm: number,
  xNorm: number,
  _zNorm: number = 0
): HumanoidVertexAssignment {
  // Bone Index Key:
  // 0: Hips, 1: Spine, 2: Chest, 3: Neck, 4: Head
  // 5: L_UpperArm, 6: L_Forearm, 7: L_Hand
  // 8: R_UpperArm, 9: R_Forearm, 10: R_Hand
  // 11: L_UpperLeg, 12: L_LowerLeg, 13: L_Foot
  // 14: R_UpperLeg, 15: R_LowerLeg, 16: R_Foot

  const isLeft = xNorm > 0.08;
  const isRight = xNorm < -0.08;
  const isArm = Math.abs(xNorm) > 0.22 && yNorm >= 0.45 && yNorm <= 0.82;

  // Head
  if (yNorm > 0.84) {
    const neckBlend = Math.max(0, 1 - (yNorm - 0.84) / 0.06);
    return {
      primaryBoneIndex: 4, // Head
      secondaryBoneIndex: 3, // Neck
      primaryWeight: 1 - neckBlend * 0.4,
      secondaryWeight: neckBlend * 0.4
    };
  }

  // Neck
  if (yNorm > 0.78) {
    return {
      primaryBoneIndex: 3, // Neck
      secondaryBoneIndex: 2, // Chest
      primaryWeight: 0.7,
      secondaryWeight: 0.3
    };
  }

  // Arms
  if (isArm) {
    const isL = isLeft;
    if (Math.abs(xNorm) > 0.6) {
      // Hands
      return {
        primaryBoneIndex: isL ? 7 : 10,
        secondaryBoneIndex: isL ? 6 : 9,
        primaryWeight: 0.85,
        secondaryWeight: 0.15
      };
    } else if (Math.abs(xNorm) > 0.38) {
      // Forearms
      return {
        primaryBoneIndex: isL ? 6 : 9,
        secondaryBoneIndex: isL ? 5 : 8,
        primaryWeight: 0.75,
        secondaryWeight: 0.25
      };
    } else {
      // Upper arms
      return {
        primaryBoneIndex: isL ? 5 : 8,
        secondaryBoneIndex: 2, // Chest
        primaryWeight: 0.7,
        secondaryWeight: 0.3
      };
    }
  }

  // Torso / Chest / Spine / Hips
  if (yNorm > 0.65) {
    return {
      primaryBoneIndex: 2, // Chest
      secondaryBoneIndex: 1, // Spine
      primaryWeight: 0.75,
      secondaryWeight: 0.25
    };
  }

  if (yNorm > 0.52) {
    return {
      primaryBoneIndex: 1, // Spine
      secondaryBoneIndex: 0, // Hips
      primaryWeight: 0.65,
      secondaryWeight: 0.35
    };
  }

  if (yNorm > 0.46) {
    return {
      primaryBoneIndex: 0, // Hips
      secondaryBoneIndex: 1, // Spine
      primaryWeight: 0.8,
      secondaryWeight: 0.2
    };
  }

  // Legs & Feet
  const legSide = isLeft ? 1 : 2; // 1 = Left, 2 = Right
  const upperLegIdx = legSide === 1 ? 11 : 14;
  const lowerLegIdx = legSide === 1 ? 12 : 15;
  const footIdx = legSide === 1 ? 13 : 16;

  if (yNorm < 0.08) {
    // Feet
    return {
      primaryBoneIndex: footIdx,
      secondaryBoneIndex: lowerLegIdx,
      primaryWeight: 0.85,
      secondaryWeight: 0.15
    };
  } else if (yNorm < 0.26) {
    // Lower Legs / Calves
    return {
      primaryBoneIndex: lowerLegIdx,
      secondaryBoneIndex: upperLegIdx,
      primaryWeight: 0.75,
      secondaryWeight: 0.25
    };
  } else {
    // Thighs / Upper Legs
    return {
      primaryBoneIndex: upperLegIdx,
      secondaryBoneIndex: 0, // Hips
      primaryWeight: 0.8,
      secondaryWeight: 0.2
    };
  }
}

/**
 * Validates emote wheel slots (maximum 6 equipped slots, no duplicates, ownership required).
 */
export function validateEmoteWheelConfiguration(
  equippedEmoteIds: string[],
  ownedEmoteIds: string[],
  maxSlots: number = 6
): { valid: boolean; validatedSlots: string[]; error?: string } {
  if (!Array.isArray(equippedEmoteIds)) {
    return { valid: false, validatedSlots: [], error: 'Emote slots must be an array.' };
  }

  if (equippedEmoteIds.length > maxSlots) {
    return { valid: false, validatedSlots: [], error: `Emote wheel cannot exceed ${maxSlots} slots.` };
  }

  // Check unique
  const uniqueSlots = Array.from(new Set(equippedEmoteIds));
  if (uniqueSlots.length !== equippedEmoteIds.length) {
    return { valid: false, validatedSlots: [], error: 'Duplicate emotes cannot be assigned to multiple slots.' };
  }

  // Verify ownership
  for (const emoteId of equippedEmoteIds) {
    if (!ownedEmoteIds.includes(emoteId)) {
      return { valid: false, validatedSlots: [], error: `Emote "${emoteId}" is not owned by this account.` };
    }
  }

  return { valid: true, validatedSlots: equippedEmoteIds };
}

/**
 * Maps a skinning weight [0.0, 1.0] to a standard Heat-Map / Weight-Paint RGB color.
 * 0.0 -> Blue, 0.25 -> Cyan, 0.5 -> Green, 0.75 -> Yellow, 1.0 -> Red
 */
export function calculateWeightHeatColor(weight: number): { r: number; g: number; b: number; hex: string } {
  const w = Math.max(0, Math.min(1, weight));
  let r = 0;
  let g = 0;
  let b = 0;

  if (w < 0.25) {
    // Blue to Cyan
    const t = w / 0.25;
    r = 0;
    g = t;
    b = 1;
  } else if (w < 0.5) {
    // Cyan to Green
    const t = (w - 0.25) / 0.25;
    r = 0;
    g = 1;
    b = 1 - t;
  } else if (w < 0.75) {
    // Green to Yellow
    const t = (w - 0.5) / 0.25;
    r = t;
    g = 1;
    b = 0;
  } else {
    // Yellow to Red
    const t = (w - 0.75) / 0.25;
    r = 1;
    g = 1 - t;
    b = 0;
  }

  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  return { r, g, b, hex };
}

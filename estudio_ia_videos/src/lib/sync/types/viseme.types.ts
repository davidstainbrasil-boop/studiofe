/**
 * Viseme types for facial animation
 * Compatible with Azure Speech SDK and standard 3D viseme sets
 */

/**
 * Azure Speech SDK viseme IDs (SVVS - Standard Viseme Vocabulary Set)
 */
export enum AzureVisemeId {
  Silence = 0,
  Ae_Ax_Ah = 1,
  Aa = 2,
  Ao = 3,
  Ey_Eh_Uh = 4,
  Er = 5,
  Y_Iy_Ih_Ix = 6,
  W_Uw = 7,
  Ow = 8,
  Aw = 9,
  Oy = 10,
  Ay = 11,
  H = 12,
  R = 13,
  L = 14,
  S_Z = 15,
  Sh_Ch_Jh_Zh = 16,
  Th_Dh = 17,
  F_V = 18,
  D_T_N = 19,
  K_G_Ng = 20,
  P_B_M = 21
}

export interface Viseme {
  visemeId: number;
  visemeName: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface AzureVisemeResult {
  visemes: Viseme[];
  audioData: Buffer;
  duration: number;
  text: string;
  voice: string;
}

/**
 * Mapping from Rhubarb phonemes to Azure viseme IDs
 */
export const RHUBARB_TO_AZURE_VISEME: Record<string, number> = {
  'A': 1,  // Ae_Ax_Ah
  'B': 21, // P_B_M
  'C': 19, // D_T_N
  'D': 16, // Sh_Ch_Jh_Zh
  'E': 4,  // Ey_Eh_Uh
  'F': 18, // F_V
  'G': 20, // K_G_Ng
  'H': 2,  // Aa
  'X': 0   // Silence
};

/**
 * ARKit blend shape names for facial animation
 */
export enum ARKitBlendShape {
  // Eye
  EyeBlinkLeft = 'eyeBlinkLeft',
  EyeBlinkRight = 'eyeBlinkRight',
  EyeLookDownLeft = 'eyeLookDownLeft',
  EyeLookDownRight = 'eyeLookDownRight',
  EyeLookInLeft = 'eyeLookInLeft',
  EyeLookInRight = 'eyeLookInRight',
  EyeLookOutLeft = 'eyeLookOutLeft',
  EyeLookOutRight = 'eyeLookOutRight',
  EyeLookUpLeft = 'eyeLookUpLeft',
  EyeLookUpRight = 'eyeLookUpRight',
  EyeSquintLeft = 'eyeSquintLeft',
  EyeSquintRight = 'eyeSquintRight',
  EyeWideLeft = 'eyeWideLeft',
  EyeWideRight = 'eyeWideRight',

  // Jaw
  JawForward = 'jawForward',
  JawLeft = 'jawLeft',
  JawOpen = 'jawOpen',
  JawRight = 'jawRight',

  // Mouth
  MouthClose = 'mouthClose',
  MouthDimpleLeft = 'mouthDimpleLeft',
  MouthDimpleRight = 'mouthDimpleRight',
  MouthFrownLeft = 'mouthFrownLeft',
  MouthFrownRight = 'mouthFrownRight',
  MouthFunnel = 'mouthFunnel',
  MouthLeft = 'mouthLeft',
  MouthLowerDownLeft = 'mouthLowerDownLeft',
  MouthLowerDownRight = 'mouthLowerDownRight',
  MouthPressLeft = 'mouthPressLeft',
  MouthPressRight = 'mouthPressRight',
  MouthPucker = 'mouthPucker',
  MouthRight = 'mouthRight',
  MouthRollLower = 'mouthRollLower',
  MouthRollUpper = 'mouthRollUpper',
  MouthShrugLower = 'mouthShrugLower',
  MouthShrugUpper = 'mouthShrugUpper',
  MouthSmileLeft = 'mouthSmileLeft',
  MouthSmileRight = 'mouthSmileRight',
  MouthStretchLeft = 'mouthStretchLeft',
  MouthStretchRight = 'mouthStretchRight',
  MouthUpperUpLeft = 'mouthUpperUpLeft',
  MouthUpperUpRight = 'mouthUpperUpRight',

  // Nose
  NoseSneerLeft = 'noseSneerLeft',
  NoseSneerRight = 'noseSneerRight',

  // Cheek
  CheekPuff = 'cheekPuff',
  CheekSquintLeft = 'cheekSquintLeft',
  CheekSquintRight = 'cheekSquintRight',

  // Brow
  BrowDownLeft = 'browDownLeft',
  BrowDownRight = 'browDownRight',
  BrowInnerUp = 'browInnerUp',
  BrowOuterUpLeft = 'browOuterUpLeft',
  BrowOuterUpRight = 'browOuterUpRight',

  // Tongue
  TongueOut = 'tongueOut'
}

export type BlendShapeWeights = Partial<Record<ARKitBlendShape, number>>;

/**
 * Viseme to blend shape mapping
 */
export interface VisemeBlendShapeMap {
  visemeId: number;
  blendShapes: BlendShapeWeights;
}

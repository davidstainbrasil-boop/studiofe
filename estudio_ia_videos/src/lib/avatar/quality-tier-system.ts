export enum AvatarQuality {
  PLACEHOLDER = 'placeholder',    // Canvas 2D instantâneo (< 1s)
  STANDARD = 'standard',          // HeyGen/D-ID API (30-60s)
  HIGH = 'high',                  // ReadyPlayerMe 3D (2-5min)
  HYPERREAL = 'hyperreal'         // Audio2Face + UE5 (10-30min)
}

export interface QualityTierConfig {
  name: AvatarQuality
  displayName: string
  estimatedTime: number // segundos
  costCredits: number
  requiredPlan: string[] // ['free', 'basic', 'pro', 'enterprise']
  providers: string[]
  features: {
    lipSync: boolean
    facialExpressions: boolean
    bodyMovement: boolean
    photoRealistic: boolean
    customization: boolean
    realTime: boolean
  }
}

export const QUALITY_TIERS: Record<AvatarQuality, QualityTierConfig> = {
  [AvatarQuality.PLACEHOLDER]: {
    name: AvatarQuality.PLACEHOLDER,
    displayName: 'Preview Rápido',
    estimatedTime: 1,
    costCredits: 0,
    requiredPlan: ['free', 'basic', 'pro', 'enterprise'],
    providers: ['local-canvas'],
    features: {
      lipSync: false,
      facialExpressions: false,
      bodyMovement: false,
      photoRealistic: false,
      customization: false,
      realTime: true
    }
  },

  [AvatarQuality.STANDARD]: {
    name: AvatarQuality.STANDARD,
    displayName: 'Qualidade Padrão',
    estimatedTime: 45,
    costCredits: 1,
    requiredPlan: ['basic', 'pro', 'enterprise'],
    providers: ['heygen', 'did'],
    features: {
      lipSync: true,
      facialExpressions: true,
      bodyMovement: false,
      photoRealistic: true,
      customization: true,
      realTime: false
    }
  },

  [AvatarQuality.HIGH]: {
    name: AvatarQuality.HIGH,
    displayName: 'Alta Qualidade 3D',
    estimatedTime: 180,
    costCredits: 3,
    requiredPlan: ['pro', 'enterprise'],
    providers: ['readyplayerme'],
    features: {
      lipSync: true,
      facialExpressions: true,
      bodyMovement: true,
      photoRealistic: true,
      customization: true,
      realTime: false
    }
  },

  [AvatarQuality.HYPERREAL]: {
    name: AvatarQuality.HYPERREAL,
    displayName: 'Hiper-Realista Cinema',
    estimatedTime: 1200,
    costCredits: 10,
    requiredPlan: ['enterprise'],
    providers: ['audio2face', 'unreal-engine'],
    features: {
      lipSync: true,
      facialExpressions: true,
      bodyMovement: true,
      photoRealistic: true,
      customization: true,
      realTime: false
    }
  }
}

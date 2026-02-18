/**
 * 📚 LMS Integration - LTI 1.3 & SCORM 1.2/2004
 * MVP Vídeos TécnicoCursos v7
 * 
 * Features:
 * - LTI 1.3 Provider completo
 * - Export SCORM 1.2 e SCORM 2004
 * - xAPI/TinCan statements
 * - Tracking de progresso e conclusão
 * - Certificados integrados
 */

import * as crypto from 'crypto';
import * as JSZip from 'jszip';

// ===========================================
// LTI 1.3 Types
// ===========================================

/** JWT Payload from LTI 1.3 Launch */
export interface LTIJWTPayload {
  sub: string;
  iss: string;
  name?: string;
  given_name?: string;
  email?: string;
  'https://purl.imsglobal.org/spec/lti/claim/roles'?: string[];
  'https://purl.imsglobal.org/spec/lti/claim/context'?: {
    id?: string;
    title?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/resource_link'?: {
    id?: string;
    title?: string;
  };
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'?: {
    lineitem?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/custom'?: Record<string, string>;
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id'?: string;
}

export interface LTIPlatformConfig {
  /** Issuer único do LMS (ex: https://moodle.empresa.com) */
  issuer: string;
  /** Client ID registrado no LMS */
  clientId: string;
  /** Deployment ID */
  deploymentId: string;
  /** URL do JWKS do LMS */
  jwksUrl: string;
  /** URL de autorização */
  authorizationUrl: string;
  /** URL do token */
  tokenUrl: string;
  /** Secret para validação */
  secret: string;
}

export interface LTILaunchRequest {
  /** JWT do launch */
  idToken: string;
  /** State para CSRF */
  state: string;
  /** Nonce */
  nonce: string;
}

export interface LTILaunchData {
  /** ID único do usuário no LMS */
  userId: string;
  /** Nome do usuário */
  userName: string;
  /** Email */
  userEmail?: string;
  /** Roles LTI */
  roles: string[];
  /** ID do contexto (curso) */
  contextId: string;
  /** Título do contexto */
  contextTitle?: string;
  /** ID do recurso */
  resourceLinkId: string;
  /** Título do recurso */
  resourceLinkTitle?: string;
  /** URL de retorno de notas */
  lineItemUrl?: string;
  /** Custom parameters */
  custom?: Record<string, string>;
  /** Issuer */
  issuer: string;
  /** Deployment ID */
  deploymentId: string;
}

export interface LTIGradeSubmission {
  /** Score (0-1) */
  scoreGiven: number;
  /** Score máximo */
  scoreMaximum: number;
  /** Comentário */
  comment?: string;
  /** Status da atividade */
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  /** Status de grading */
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
  /** Timestamp */
  timestamp: string;
  /** ID do usuário */
  userId: string;
}

// ===========================================
// SCORM Types
// ===========================================

export type SCORMVersion = 'scorm12' | 'scorm2004';

export interface SCORMExportConfig {
  /** Versão SCORM */
  version: SCORMVersion;
  /** Título do curso */
  title: string;
  /** Descrição */
  description?: string;
  /** Identificador único */
  identifier: string;
  /** Organização */
  organization?: string;
  /** Arquivo de entrada (HTML) */
  entryPoint: string;
  /** Requisitos de conclusão */
  completionRequirements?: {
    /** Score mínimo para passar (0-100) */
    passingScore?: number;
    /** Tempo mínimo em segundos */
    minimumTime?: number;
    /** Requer visualização completa */
    requireFullView?: boolean;
  };
  /** Metadata adicional */
  metadata?: {
    author?: string;
    keywords?: string[];
    language?: string;
    version?: string;
    copyright?: string;
  };
}

export interface SCORMPackageResult {
  /** Buffer do ZIP */
  buffer: Buffer;
  /** Nome do arquivo */
  filename: string;
  /** Tamanho em bytes */
  size: number;
  /** Checksum MD5 */
  checksum: string;
  /** Versão SCORM */
  version: SCORMVersion;
}

// ===========================================
// xAPI Types
// ===========================================

export interface xAPIStatement {
  actor: {
    objectType: 'Agent';
    name: string;
    mbox?: string;
    account?: {
      homePage: string;
      name: string;
    };
  };
  verb: {
    id: string;
    display: Record<string, string>;
  };
  object: {
    objectType: 'Activity';
    id: string;
    definition?: {
      name: Record<string, string>;
      description?: Record<string, string>;
      type?: string;
    };
  };
  result?: {
    score?: {
      scaled?: number;
      raw?: number;
      min?: number;
      max?: number;
    };
    success?: boolean;
    completion?: boolean;
    duration?: string;
  };
  context?: {
    registration?: string;
    contextActivities?: {
      parent?: { id: string; objectType: string }[];
      grouping?: { id: string; objectType: string }[];
    };
  };
  timestamp?: string;
}

// ===========================================
// LTI 1.3 Service
// ===========================================

export class LTIService {
  private platforms: Map<string, LTIPlatformConfig> = new Map();
  private nonceStore: Map<string, { timestamp: number; used: boolean }> = new Map();
  private stateStore: Map<string, { platformId: string; timestamp: number }> = new Map();

  constructor() {
    // Cleanup de nonces/states antigos a cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Registra uma plataforma LMS
   */
  registerPlatform(config: LTIPlatformConfig): void {
    this.platforms.set(config.issuer, config);
  }

  /**
   * Obtém plataforma registrada
   */
  getPlatform(issuer: string): LTIPlatformConfig | undefined {
    return this.platforms.get(issuer);
  }

  /**
   * Gera URL de login para iniciar OIDC flow
   */
  generateLoginUrl(
    platformIssuer: string,
    targetLinkUri: string,
    loginHint?: string,
    ltiMessageHint?: string
  ): string {
    const platform = this.platforms.get(platformIssuer);
    if (!platform) {
      throw new Error(`Platform not registered: ${platformIssuer}`);
    }

    const state = this.generateState(platformIssuer);
    const nonce = this.generateNonce();

    const params = new URLSearchParams({
      scope: 'openid',
      response_type: 'id_token',
      response_mode: 'form_post',
      prompt: 'none',
      client_id: platform.clientId,
      redirect_uri: targetLinkUri,
      state,
      nonce,
      login_hint: loginHint || '',
      lti_message_hint: ltiMessageHint || '',
    });

    return `${platform.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Valida launch request e extrai dados
   */
  async validateLaunch(request: LTILaunchRequest): Promise<LTILaunchData> {
    // Validar state
    const stateData = this.stateStore.get(request.state);
    if (!stateData) {
      throw new Error('Invalid or expired state');
    }
    this.stateStore.delete(request.state);

    const platform = this.platforms.get(stateData.platformId);
    if (!platform) {
      throw new Error('Platform not found');
    }

    // Validar e decodificar JWT (simplificado - em produção usar jose ou similar)
    const payload = this.decodeJWT(request.idToken);

    // Validar nonce
    const nonceData = this.nonceStore.get(request.nonce);
    if (!nonceData || nonceData.used) {
      throw new Error('Invalid or reused nonce');
    }
    nonceData.used = true;

    // Extrair dados do launch
    return {
      userId: payload.sub,
      userName: payload.name || payload.given_name || 'Unknown',
      userEmail: payload.email,
      roles: payload['https://purl.imsglobal.org/spec/lti/claim/roles'] || [],
      contextId: payload['https://purl.imsglobal.org/spec/lti/claim/context']?.id || '',
      contextTitle: payload['https://purl.imsglobal.org/spec/lti/claim/context']?.title,
      resourceLinkId: payload['https://purl.imsglobal.org/spec/lti/claim/resource_link']?.id || '',
      resourceLinkTitle: payload['https://purl.imsglobal.org/spec/lti/claim/resource_link']?.title,
      lineItemUrl: payload['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint']?.lineitem,
      custom: payload['https://purl.imsglobal.org/spec/lti/claim/custom'],
      issuer: payload.iss,
      deploymentId: payload['https://purl.imsglobal.org/spec/lti/claim/deployment_id'] || '',
    };
  }

  /**
   * Submete nota via Assignment and Grade Services
   */
  async submitGrade(
    platformIssuer: string,
    lineItemUrl: string,
    grade: LTIGradeSubmission
  ): Promise<boolean> {
    const platform = this.platforms.get(platformIssuer);
    if (!platform) {
      throw new Error('Platform not registered');
    }

    // Obter access token
    const accessToken = await this.getAccessToken(platform, [
      'https://purl.imsglobal.org/spec/lti-ags/scope/score',
    ]);

    // Submeter score
    const scoreUrl = `${lineItemUrl}/scores`;
    const response = await fetch(scoreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId: grade.userId,
        scoreGiven: grade.scoreGiven,
        scoreMaximum: grade.scoreMaximum,
        comment: grade.comment,
        activityProgress: grade.activityProgress,
        gradingProgress: grade.gradingProgress,
        timestamp: grade.timestamp,
      }),
    });

    return response.ok;
  }

  /**
   * Obtém access token via Client Credentials
   */
  private async getAccessToken(platform: LTIPlatformConfig, scopes: string[]): Promise<string> {
    const assertion = this.createClientAssertion(platform);

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
      scope: scopes.join(' '),
    });

    const response = await fetch(platform.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to get access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Cria JWT assertion para client credentials
   */
  private createClientAssertion(platform: LTIPlatformConfig): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: platform.clientId,
      sub: platform.clientId,
      aud: platform.tokenUrl,
      iat: now,
      exp: now + 300,
      jti: crypto.randomUUID(),
    };

    // Simplificado - em produção usar jose ou similar com chave RSA
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', platform.secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Decodifica JWT (sem validação completa - para produção usar jose)
   */
  private decodeJWT(token: string): LTIJWTPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT');
    }
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as LTIJWTPayload;
  }

  /**
   * Gera state para CSRF
   */
  private generateState(platformId: string): string {
    const state = crypto.randomBytes(32).toString('base64url');
    this.stateStore.set(state, { platformId, timestamp: Date.now() });
    return state;
  }

  /**
   * Gera nonce
   */
  private generateNonce(): string {
    const nonce = crypto.randomBytes(32).toString('base64url');
    this.nonceStore.set(nonce, { timestamp: Date.now(), used: false });
    return nonce;
  }

  /**
   * Limpa nonces e states expirados
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutos

    const nonceEntries = Array.from(this.nonceStore.entries());
    for (const [key, value] of nonceEntries) {
      if (now - value.timestamp > maxAge) {
        this.nonceStore.delete(key);
      }
    }

    const stateEntries = Array.from(this.stateStore.entries());
    for (const [key, value] of stateEntries) {
      if (now - value.timestamp > maxAge) {
        this.stateStore.delete(key);
      }
    }
  }
}

// ===========================================
// SCORM Package Generator
// ===========================================

export class SCORMPackageGenerator {
  /**
   * Gera pacote SCORM completo
   */
  async generatePackage(
    config: SCORMExportConfig,
    videoUrl: string,
    slides: { id: string; title: string; duration: number }[]
  ): Promise<SCORMPackageResult> {
    const zip = new JSZip();

    // Adicionar manifest
    const manifest = this.generateManifest(config, slides);
    zip.file('imsmanifest.xml', manifest);

    // Adicionar HTML player
    const playerHtml = this.generatePlayerHtml(config, videoUrl, slides);
    zip.file(config.entryPoint, playerHtml);

    // Adicionar API wrapper
    const apiWrapper = this.generateApiWrapper(config.version);
    zip.file('js/scorm-api.js', apiWrapper);

    // Adicionar CSS
    const styles = this.generateStyles();
    zip.file('css/player.css', styles);

    // Gerar ZIP
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const checksum = crypto.createHash('md5').update(buffer).digest('hex');

    return {
      buffer,
      filename: `${config.identifier}_${config.version}.zip`,
      size: buffer.length,
      checksum,
      version: config.version,
    };
  }

  /**
   * Gera imsmanifest.xml
   */
  private generateManifest(
    config: SCORMExportConfig,
    slides: { id: string; title: string; duration: number }[]
  ): string {
    const isSCORM2004 = config.version === 'scorm2004';
    const schemaVersion = isSCORM2004 ? '2004 4th Edition' : '1.2';
    const namespace = isSCORM2004
      ? 'http://www.imsglobal.org/xsd/imscp_v1p1'
      : 'http://www.imsproject.org/xsd/imscp_rootv1p1p2';

    const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0);
    const durationISO = this.formatDuration(totalDuration);

    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${config.identifier}" version="1.0"
  xmlns="${namespace}"
  xmlns:adlcp="${isSCORM2004 ? 'http://www.adlnet.org/xsd/adlcp_v1p3' : 'http://www.adlnet.org/xsd/adlcp_rootv1p2'}"
  ${isSCORM2004 ? 'xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"' : ''}
  ${isSCORM2004 ? 'xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"' : ''}
  xmlns:imsss="${isSCORM2004 ? 'http://www.imsglobal.org/xsd/imsss' : ''}">
  
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>${schemaVersion}</schemaversion>
    ${config.metadata ? `
    <lom xmlns="http://ltsc.ieee.org/xsd/LOM">
      <general>
        <title><string language="${config.metadata.language || 'pt-BR'}">${config.title}</string></title>
        ${config.description ? `<description><string language="${config.metadata.language || 'pt-BR'}">${config.description}</string></description>` : ''}
        ${config.metadata.keywords ? config.metadata.keywords.map(k => `<keyword><string language="${config.metadata?.language || 'pt-BR'}">${k}</string></keyword>`).join('\n        ') : ''}
      </general>
      <lifeCycle>
        ${config.metadata.version ? `<version><string>${config.metadata.version}</string></version>` : ''}
      </lifeCycle>
      <technical>
        <duration>${durationISO}</duration>
      </technical>
      <rights>
        ${config.metadata.copyright ? `<description><string>${config.metadata.copyright}</string></description>` : ''}
      </rights>
    </lom>
    ` : ''}
  </metadata>

  <organizations default="ORG-${config.identifier}">
    <organization identifier="ORG-${config.identifier}">
      <title>${config.title}</title>
      <item identifier="ITEM-${config.identifier}" identifierref="RES-${config.identifier}">
        <title>${config.title}</title>
        ${isSCORM2004 && config.completionRequirements ? `
        <imsss:sequencing>
          <imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/>
          ${config.completionRequirements.passingScore !== undefined ? `
          <imsss:objectives>
            <imsss:primaryObjective objectiveID="PRIMARYOBJ" satisfiedByMeasure="true">
              <imsss:minNormalizedMeasure>${config.completionRequirements.passingScore / 100}</imsss:minNormalizedMeasure>
            </imsss:primaryObjective>
          </imsss:objectives>
          ` : ''}
        </imsss:sequencing>
        ` : ''}
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="RES-${config.identifier}" type="webcontent" ${isSCORM2004 ? 'adlcp:scormType="sco"' : 'adlcp:scormtype="sco"'} href="${config.entryPoint}">
      <file href="${config.entryPoint}"/>
      <file href="js/scorm-api.js"/>
      <file href="css/player.css"/>
    </resource>
  </resources>
</manifest>`;
  }

  /**
   * Gera HTML do player
   */
  private generatePlayerHtml(
    config: SCORMExportConfig,
    videoUrl: string,
    slides: { id: string; title: string; duration: number }[]
  ): string {
    const isSCORM2004 = config.version === 'scorm2004';

    return `<!DOCTYPE html>
<html lang="${config.metadata?.language || 'pt-BR'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <link rel="stylesheet" href="css/player.css">
  <script src="js/scorm-api.js"></script>
</head>
<body>
  <div id="player-container">
    <header>
      <h1>${config.title}</h1>
      <div id="progress-info">
        <span id="current-slide">Slide 1</span> / <span id="total-slides">${slides.length}</span>
        <span id="progress-percent">0%</span>
      </div>
    </header>
    
    <main>
      <video id="video-player" controls>
        <source src="${videoUrl}" type="video/mp4">
        Seu navegador não suporta vídeo HTML5.
      </video>
    </main>
    
    <nav id="slides-nav">
      ${slides.map((s, i) => `
      <button class="slide-btn" data-index="${i}" data-time="${this.getSlideStartTime(slides, i)}">
        ${s.title}
      </button>
      `).join('')}
    </nav>
    
    <footer>
      <button id="btn-prev">← Anterior</button>
      <button id="btn-next">Próximo →</button>
      <button id="btn-complete" disabled>Concluir</button>
    </footer>
  </div>

  <script>
    // SCORM API Configuration
    const SCORM_VERSION = '${isSCORM2004 ? '2004' : '1.2'}';
    const PASSING_SCORE = ${config.completionRequirements?.passingScore || 0};
    const REQUIRE_FULL_VIEW = ${config.completionRequirements?.requireFullView || false};
    const TOTAL_SLIDES = ${slides.length};
    const TOTAL_DURATION = ${slides.reduce((sum, s) => sum + s.duration, 0)};
    
    // Initialize SCORM
    document.addEventListener('DOMContentLoaded', function() {
      SCORM.init(SCORM_VERSION);
      initPlayer();
    });
    
    // Cleanup on close
    window.addEventListener('beforeunload', function() {
      saveProgress();
      SCORM.terminate();
    });
  </script>
  <script>
    let currentSlide = 0;
    let viewedSlides = new Set();
    let startTime = new Date();
    
    function initPlayer() {
      const video = document.getElementById('video-player');
      const slides = document.querySelectorAll('.slide-btn');
      
      // Resume from saved position
      const savedLocation = SCORM.getValue('${isSCORM2004 ? 'cmi.location' : 'cmi.core.lesson_location'}');
      if (savedLocation) {
        currentSlide = parseInt(savedLocation, 10) || 0;
        video.currentTime = getSlideTime(currentSlide);
        updateUI();
      }
      
      // Track video progress
      video.addEventListener('timeupdate', function() {
        const slideIndex = getCurrentSlideFromTime(video.currentTime);
        if (slideIndex !== currentSlide) {
          currentSlide = slideIndex;
          viewedSlides.add(slideIndex);
          updateUI();
          saveProgress();
        }
      });
      
      video.addEventListener('ended', function() {
        viewedSlides.add(TOTAL_SLIDES - 1);
        checkCompletion();
      });
      
      // Navigation
      slides.forEach(btn => {
        btn.addEventListener('click', function() {
          video.currentTime = parseFloat(this.dataset.time);
        });
      });
      
      document.getElementById('btn-prev').addEventListener('click', () => navigateSlide(-1));
      document.getElementById('btn-next').addEventListener('click', () => navigateSlide(1));
      document.getElementById('btn-complete').addEventListener('click', completeLesson);
      
      // Mark as started
      SCORM.setValue('${isSCORM2004 ? 'cmi.completion_status' : 'cmi.core.lesson_status'}', '${isSCORM2004 ? 'incomplete' : 'incomplete'}');
    }
    
    function getSlideTime(index) {
      const slides = document.querySelectorAll('.slide-btn');
      return parseFloat(slides[index]?.dataset.time || 0);
    }
    
    function getCurrentSlideFromTime(time) {
      const slides = document.querySelectorAll('.slide-btn');
      let slideIndex = 0;
      slides.forEach((btn, i) => {
        if (time >= parseFloat(btn.dataset.time)) {
          slideIndex = i;
        }
      });
      return slideIndex;
    }
    
    function navigateSlide(direction) {
      const newIndex = currentSlide + direction;
      if (newIndex >= 0 && newIndex < TOTAL_SLIDES) {
        document.getElementById('video-player').currentTime = getSlideTime(newIndex);
      }
    }
    
    function updateUI() {
      document.getElementById('current-slide').textContent = 'Slide ' + (currentSlide + 1);
      const progress = Math.round((viewedSlides.size / TOTAL_SLIDES) * 100);
      document.getElementById('progress-percent').textContent = progress + '%';
      
      document.querySelectorAll('.slide-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === currentSlide);
        btn.classList.toggle('viewed', viewedSlides.has(i));
      });
      
      document.getElementById('btn-complete').disabled = !canComplete();
    }
    
    function canComplete() {
      if (REQUIRE_FULL_VIEW) {
        return viewedSlides.size >= TOTAL_SLIDES;
      }
      return true;
    }
    
    function saveProgress() {
      const progress = Math.round((viewedSlides.size / TOTAL_SLIDES) * 100);
      const sessionTime = formatSessionTime(new Date() - startTime);
      
      SCORM.setValue('${isSCORM2004 ? 'cmi.location' : 'cmi.core.lesson_location'}', currentSlide.toString());
      SCORM.setValue('${isSCORM2004 ? 'cmi.progress_measure' : 'cmi.core.score.raw'}', progress.toString());
      SCORM.setValue('${isSCORM2004 ? 'cmi.session_time' : 'cmi.core.session_time'}', sessionTime);
      SCORM.commit();
    }
    
    function completeLesson() {
      const score = Math.round((viewedSlides.size / TOTAL_SLIDES) * 100);
      const passed = score >= PASSING_SCORE;
      
      SCORM.setValue('${isSCORM2004 ? 'cmi.score.scaled' : 'cmi.core.score.raw'}', (score / 100).toString());
      SCORM.setValue('${isSCORM2004 ? 'cmi.score.raw' : 'cmi.core.score.raw'}', score.toString());
      SCORM.setValue('${isSCORM2004 ? 'cmi.score.min' : 'cmi.core.score.min'}', '0');
      SCORM.setValue('${isSCORM2004 ? 'cmi.score.max' : 'cmi.core.score.max'}', '100');
      SCORM.setValue('${isSCORM2004 ? 'cmi.completion_status' : 'cmi.core.lesson_status'}', '${isSCORM2004 ? 'completed' : 'completed'}');
      SCORM.setValue('${isSCORM2004 ? 'cmi.success_status' : 'cmi.core.lesson_status'}', passed ? '${isSCORM2004 ? 'passed' : 'passed'}' : '${isSCORM2004 ? 'failed' : 'failed'}');
      SCORM.commit();
      
      alert(passed ? 'Parabéns! Você concluiu o curso com sucesso!' : 'Curso concluído. Score: ' + score + '%');
      SCORM.terminate();
    }
    
    function formatSessionTime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      return 'PT' + hours + 'H' + (minutes % 60) + 'M' + (seconds % 60) + 'S';
    }
  </script>
</body>
</html>`;
  }

  /**
   * Gera wrapper da API SCORM
   */
  private generateApiWrapper(version: SCORMVersion): string {
    return `/**
 * SCORM API Wrapper
 * Suporta SCORM 1.2 e SCORM 2004
 */
const SCORM = {
  version: null,
  api: null,
  
  init: function(version) {
    this.version = version;
    this.api = this.findAPI(window);
    
    if (!this.api) {
      console.warn('SCORM API not found. Running in standalone mode.');
      this.api = this.createMockAPI();
    }
    
    if (version === '2004') {
      this.api.Initialize('');
    } else {
      this.api.LMSInitialize('');
    }
    
    return true;
  },
  
  findAPI: function(win) {
    let api = null;
    let tries = 0;
    
    while (!api && win && tries < 10) {
      api = this.version === '2004' ? win.API_1484_11 : win.API;
      if (!api) {
        win = win.parent !== win ? win.parent : (win.opener || null);
      }
      tries++;
    }
    
    return api;
  },
  
  createMockAPI: function() {
    const data = {};
    return {
      Initialize: () => 'true',
      LMSInitialize: () => 'true',
      Terminate: () => 'true',
      LMSFinish: () => 'true',
      GetValue: (key) => data[key] || '',
      LMSGetValue: (key) => data[key] || '',
      SetValue: (key, val) => { data[key] = val; return 'true'; },
      LMSSetValue: (key, val) => { data[key] = val; return 'true'; },
      Commit: () => 'true',
      LMSCommit: () => 'true',
      GetLastError: () => '0',
      LMSGetLastError: () => '0',
      GetErrorString: () => '',
      LMSGetErrorString: () => '',
      GetDiagnostic: () => '',
      LMSGetDiagnostic: () => ''
    };
  },
  
  getValue: function(key) {
    if (this.version === '2004') {
      return this.api.GetValue(key);
    }
    return this.api.LMSGetValue(key);
  },
  
  setValue: function(key, value) {
    if (this.version === '2004') {
      return this.api.SetValue(key, value);
    }
    return this.api.LMSSetValue(key, value);
  },
  
  commit: function() {
    if (this.version === '2004') {
      return this.api.Commit('');
    }
    return this.api.LMSCommit('');
  },
  
  terminate: function() {
    if (this.version === '2004') {
      return this.api.Terminate('');
    }
    return this.api.LMSFinish('');
  }
};
`;
  }

  /**
   * Gera CSS do player
   */
  private generateStyles(): string {
    return `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #eee; min-height: 100vh; }
#player-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #333; margin-bottom: 20px; }
header h1 { font-size: 1.5rem; }
#progress-info { font-size: 0.9rem; color: #888; }
#progress-percent { margin-left: 15px; font-weight: bold; color: #4caf50; }
main { position: relative; }
video { width: 100%; border-radius: 8px; background: #000; }
#slides-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 20px 0; }
.slide-btn { padding: 8px 16px; background: #2a2a4a; border: 1px solid #444; border-radius: 4px; color: #ccc; cursor: pointer; transition: all 0.2s; }
.slide-btn:hover { background: #3a3a5a; }
.slide-btn.active { background: #4a4aff; color: #fff; border-color: #6a6aff; }
.slide-btn.viewed { border-color: #4caf50; }
footer { display: flex; justify-content: center; gap: 20px; padding: 20px 0; border-top: 1px solid #333; }
footer button { padding: 12px 24px; font-size: 1rem; background: #4a4aff; border: none; border-radius: 6px; color: #fff; cursor: pointer; transition: all 0.2s; }
footer button:hover:not(:disabled) { background: #5a5aff; }
footer button:disabled { opacity: 0.5; cursor: not-allowed; }
#btn-complete { background: #4caf50; }
#btn-complete:hover:not(:disabled) { background: #66bb6a; }`;
  }

  /**
   * Calcula tempo de início de um slide
   */
  private getSlideStartTime(
    slides: { duration: number }[],
    index: number
  ): number {
    let time = 0;
    for (let i = 0; i < index; i++) {
      time += slides[i].duration;
    }
    return time;
  }

  /**
   * Formata duração em ISO 8601
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `PT${hours}H${minutes}M${secs}S`;
  }
}

// ===========================================
// xAPI Service
// ===========================================

export class xAPIService {
  private endpoint: string;
  private auth: string;

  constructor(endpoint?: string, username?: string, password?: string) {
    this.endpoint = endpoint || process.env.XAPI_ENDPOINT || '';
    this.auth = username && password
      ? Buffer.from(`${username}:${password}`).toString('base64')
      : '';
  }

  /**
   * Envia statement xAPI
   */
  async sendStatement(statement: xAPIStatement): Promise<string | null> {
    if (!this.endpoint) {
      console.warn('[xAPI] Endpoint not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.endpoint}/statements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Experience-API-Version': '1.0.3',
          ...(this.auth ? { Authorization: `Basic ${this.auth}` } : {}),
        },
        body: JSON.stringify(statement),
      });

      if (response.ok) {
        const ids = await response.json();
        return ids[0];
      }
      return null;
    } catch (error) {
      console.error('[xAPI] Send statement failed:', error);
      return null;
    }
  }

  /**
   * Cria statement de início de curso
   */
  createLaunchedStatement(
    actor: xAPIStatement['actor'],
    courseId: string,
    courseName: string
  ): xAPIStatement {
    return {
      actor,
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/launched',
        display: { 'en-US': 'launched', 'pt-BR': 'iniciou' },
      },
      object: {
        objectType: 'Activity',
        id: courseId,
        definition: {
          name: { 'pt-BR': courseName },
          type: 'http://adlnet.gov/expapi/activities/course',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cria statement de progresso
   */
  createProgressedStatement(
    actor: xAPIStatement['actor'],
    courseId: string,
    courseName: string,
    progress: number
  ): xAPIStatement {
    return {
      actor,
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/progressed',
        display: { 'en-US': 'progressed', 'pt-BR': 'progrediu' },
      },
      object: {
        objectType: 'Activity',
        id: courseId,
        definition: {
          name: { 'pt-BR': courseName },
          type: 'http://adlnet.gov/expapi/activities/course',
        },
      },
      result: {
        completion: false,
        score: { scaled: progress / 100 },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cria statement de conclusão
   */
  createCompletedStatement(
    actor: xAPIStatement['actor'],
    courseId: string,
    courseName: string,
    score: number,
    passed: boolean,
    duration: string
  ): xAPIStatement {
    return {
      actor,
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/completed',
        display: { 'en-US': 'completed', 'pt-BR': 'completou' },
      },
      object: {
        objectType: 'Activity',
        id: courseId,
        definition: {
          name: { 'pt-BR': courseName },
          type: 'http://adlnet.gov/expapi/activities/course',
        },
      },
      result: {
        completion: true,
        success: passed,
        score: {
          scaled: score / 100,
          raw: score,
          min: 0,
          max: 100,
        },
        duration,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// ===========================================
// Singleton Exports
// ===========================================

export const ltiService = new LTIService();
export const scormGenerator = new SCORMPackageGenerator();
export const xapiService = new xAPIService();

export default {
  LTIService,
  SCORMPackageGenerator,
  xAPIService,
  ltiService,
  scormGenerator,
  xapiService,
};

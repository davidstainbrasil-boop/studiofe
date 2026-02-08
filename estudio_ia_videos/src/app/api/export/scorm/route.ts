import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { withPlanGuard } from '@/middleware/with-plan-guard';
import { applyRateLimit } from '@/lib/rate-limit';

// SCORM 1.2 manifest template
const SCORM_12_MANIFEST = (courseId: string, title: string, description: string) => `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${courseId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org_${courseId}">
    <organization identifier="org_${courseId}">
      <title>${escapeXml(title)}</title>
      <item identifier="item_${courseId}" identifierref="res_${courseId}">
        <title>${escapeXml(title)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_${courseId}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="video.mp4"/>
      <file href="scorm-api.js"/>
      <file href="style.css"/>
    </resource>
  </resources>
</manifest>`;

// SCORM 2004 manifest template
const SCORM_2004_MANIFEST = (courseId: string, title: string, description: string) => `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${courseId}" version="1"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                      http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                      http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                      http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
                      http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="org_${courseId}">
    <organization identifier="org_${courseId}">
      <title>${escapeXml(title)}</title>
      <item identifier="item_${courseId}" identifierref="res_${courseId}">
        <title>${escapeXml(title)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_${courseId}" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="video.mp4"/>
      <file href="scorm-api.js"/>
      <file href="style.css"/>
    </resource>
  </resources>
</manifest>`;

// SCORM JavaScript API wrapper
const SCORM_API_JS = `
// SCORM API Wrapper
(function() {
  'use strict';
  
  var scorm = {
    version: null,
    API: null,
    
    // Find SCORM API
    findAPI: function(win) {
      var attempts = 0;
      while (win && !win.API && !win.API_1484_11 && attempts < 10) {
        if (win.parent === win) break;
        win = win.parent;
        attempts++;
      }
      
      if (win.API_1484_11) {
        this.version = '2004';
        return win.API_1484_11;
      } else if (win.API) {
        this.version = '1.2';
        return win.API;
      }
      return null;
    },
    
    // Initialize
    init: function() {
      this.API = this.findAPI(window);
      if (!this.API) {
        this.API = this.findAPI(window.opener);
      }
      
      if (this.API) {
        if (this.version === '2004') {
          this.API.Initialize('');
        } else {
          this.API.LMSInitialize('');
        }
        return true;
      }
      logger.warn('SCORM API not found - running in standalone mode');
      return false;
    },
    
    // Set value
    setValue: function(key, value) {
      if (!this.API) return false;
      
      if (this.version === '2004') {
        return this.API.SetValue(key, value) === 'true';
      } else {
        // Map 2004 keys to 1.2
        var key12 = this.mapKey(key);
        return this.API.LMSSetValue(key12, value) === 'true';
      }
    },
    
    // Get value
    getValue: function(key) {
      if (!this.API) return '';
      
      if (this.version === '2004') {
        return this.API.GetValue(key);
      } else {
        var key12 = this.mapKey(key);
        return this.API.LMSGetValue(key12);
      }
    },
    
    // Commit
    commit: function() {
      if (!this.API) return false;
      
      if (this.version === '2004') {
        return this.API.Commit('') === 'true';
      } else {
        return this.API.LMSCommit('') === 'true';
      }
    },
    
    // Terminate
    terminate: function() {
      if (!this.API) return false;
      
      if (this.version === '2004') {
        return this.API.Terminate('') === 'true';
      } else {
        return this.API.LMSFinish('') === 'true';
      }
    },
    
    // Map 2004 keys to 1.2
    mapKey: function(key) {
      var mapping = {
        'cmi.completion_status': 'cmi.core.lesson_status',
        'cmi.success_status': 'cmi.core.lesson_status',
        'cmi.score.raw': 'cmi.core.score.raw',
        'cmi.score.min': 'cmi.core.score.min',
        'cmi.score.max': 'cmi.core.score.max',
        'cmi.session_time': 'cmi.core.session_time',
        'cmi.location': 'cmi.core.lesson_location',
        'cmi.exit': 'cmi.core.exit'
      };
      return mapping[key] || key;
    },
    
    // Set completion
    setComplete: function() {
      this.setValue('cmi.completion_status', 'completed');
      this.setValue('cmi.success_status', 'passed');
      this.commit();
    },
    
    // Set progress
    setProgress: function(percent) {
      this.setValue('cmi.progress_measure', (percent / 100).toString());
      if (percent >= 100) {
        this.setComplete();
      }
      this.commit();
    },
    
    // Set location (bookmark)
    setLocation: function(location) {
      this.setValue('cmi.location', location);
      this.commit();
    },
    
    // Get location
    getLocation: function() {
      return this.getValue('cmi.location');
    },
    
    // Format time for SCORM
    formatTime: function(seconds) {
      var hours = Math.floor(seconds / 3600);
      var mins = Math.floor((seconds % 3600) / 60);
      var secs = Math.floor(seconds % 60);
      
      if (this.version === '2004') {
        return 'PT' + hours + 'H' + mins + 'M' + secs + 'S';
      } else {
        return hours.toString().padStart(4, '0') + ':' + 
               mins.toString().padStart(2, '0') + ':' + 
               secs.toString().padStart(2, '0');
      }
    }
  };
  
  // Expose globally
  window.ScormAPI = scorm;
})();
`;

// HTML player template
const HTML_PLAYER = (title: string, videoUrl: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(title)}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeXml(title)}</h1>
    </header>
    
    <main>
      <div class="video-container">
        <video id="video" controls>
          <source src="video.mp4" type="video/mp4">
          Seu navegador não suporta vídeos HTML5.
        </video>
      </div>
      
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      
      <div class="controls">
        <span id="progressText">Progresso: 0%</span>
        <button id="markComplete" class="btn" disabled>Marcar como Concluído</button>
      </div>
    </main>
    
    <footer>
      <p>Powered by Estúdio IA Vídeos</p>
    </footer>
  </div>
  
  <script src="scorm-api.js"></script>
  <script>
    (function() {
      var video = document.getElementById('video');
      var progressFill = document.getElementById('progressFill');
      var progressText = document.getElementById('progressText');
      var markCompleteBtn = document.getElementById('markComplete');
      var startTime = Date.now();
      var watchedPercent = 0;
      var isComplete = false;
      
      // Initialize SCORM
      ScormAPI.init();
      
      // Restore position
      var savedPosition = ScormAPI.getLocation();
      if (savedPosition) {
        video.currentTime = parseFloat(savedPosition);
      }
      
      // Track progress
      video.addEventListener('timeupdate', function() {
        if (video.duration) {
          var percent = Math.floor((video.currentTime / video.duration) * 100);
          if (percent > watchedPercent) {
            watchedPercent = percent;
            progressFill.style.width = percent + '%';
            progressText.textContent = 'Progresso: ' + percent + '%';
            ScormAPI.setProgress(percent);
            ScormAPI.setLocation(video.currentTime.toString());
            
            if (percent >= 95 && !isComplete) {
              markCompleteBtn.disabled = false;
            }
          }
        }
      });
      
      // Video ended
      video.addEventListener('ended', function() {
        watchedPercent = 100;
        progressFill.style.width = '100%';
        progressText.textContent = 'Progresso: 100%';
        ScormAPI.setComplete();
        markCompleteBtn.disabled = true;
        isComplete = true;
        alert('Parabéns! Você concluiu o treinamento.');
      });
      
      // Manual complete
      markCompleteBtn.addEventListener('click', function() {
        ScormAPI.setComplete();
        markCompleteBtn.disabled = true;
        isComplete = true;
        alert('Treinamento marcado como concluído!');
      });
      
      // Before unload - save session time
      window.addEventListener('beforeunload', function() {
        var sessionTime = Math.floor((Date.now() - startTime) / 1000);
        ScormAPI.setValue('cmi.session_time', ScormAPI.formatTime(sessionTime));
        ScormAPI.terminate();
      });
    })();
  </script>
</body>
</html>`;

// CSS styles
const CSS_STYLES = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f3f4f6;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

header {
  text-align: center;
  padding: 20px 0;
}

header h1 {
  color: #1f2937;
  font-size: 1.5rem;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.video-container {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

video {
  width: 100%;
  max-height: 70vh;
  display: block;
}

.progress-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  margin: 20px 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #4f46e5);
  width: 0%;
  transition: width 0.3s ease;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

#progressText {
  color: #6b7280;
  font-size: 0.875rem;
}

.btn {
  background: #7c3aed;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn:hover:not(:disabled) {
  background: #6d28d9;
}

.btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

footer {
  text-align: center;
  padding: 20px 0;
  color: #9ca3af;
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .controls {
    flex-direction: column;
    gap: 10px;
  }
}
`;

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate unique course ID
function generateCourseId(): string {
  return `course_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

const handlePost = async (req: NextRequest) => {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    
    const {
      projectId,
      videoUrl,
      title,
      description = '',
      scormVersion = '1.2', // '1.2' or '2004'
    } = body;

    // Validate required fields
    if (!projectId || !videoUrl || !title) {
      return NextResponse.json(
        { error: 'projectId, videoUrl e title são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate SCORM version
    if (!['1.2', '2004'].includes(scormVersion)) {
      return NextResponse.json(
        { error: 'Versão SCORM inválida. Use "1.2" ou "2004"' },
        { status: 400 }
      );
    }

    const courseId = generateCourseId();

    // Generate manifest based on version
    const manifest = scormVersion === '2004'
      ? SCORM_2004_MANIFEST(courseId, title, description)
      : SCORM_12_MANIFEST(courseId, title, description);

    // Generate other files
    const htmlPlayer = HTML_PLAYER(title, videoUrl);
    const scormApiJs = SCORM_API_JS;
    const cssStyles = CSS_STYLES;

    // Return SCORM package files
    // In production, these would be zipped together
    const scormPackage = {
      courseId,
      version: scormVersion,
      files: [
        {
          name: 'imsmanifest.xml',
          content: manifest,
          type: 'application/xml',
        },
        {
          name: 'index.html',
          content: htmlPlayer,
          type: 'text/html',
        },
        {
          name: 'scorm-api.js',
          content: scormApiJs,
          type: 'application/javascript',
        },
        {
          name: 'style.css',
          content: cssStyles,
          type: 'text/css',
        },
      ],
      videoUrl, // Client needs to download and include this
    };

    logger.info('SCORM package generated', {
      userId: user.id,
      projectId,
      courseId,
      scormVersion,
    });

    // Track export in analytics - using any cast as table is created via migration
    const { error: analyticsError } = await supabase
      .from('scorm_exports' as never)
      .insert({
        user_id: user.id,
        project_id: projectId,
        course_id: courseId,
        scorm_version: scormVersion,
        title,
        created_at: new Date().toISOString(),
      });

    if (analyticsError) {
      logger.warn('Failed to track SCORM export', { error: analyticsError.message });
    }

    return NextResponse.json({
      success: true,
      package: scormPackage,
      instructions: {
        pt: 'Baixe todos os arquivos e o vídeo, coloque na mesma pasta e crie um arquivo ZIP. O ZIP pode ser importado em qualquer LMS compatível com SCORM.',
        steps: [
          '1. Baixe os arquivos gerados',
          '2. Baixe o vídeo MP4 e renomeie para "video.mp4"',
          '3. Coloque todos os arquivos em uma pasta',
          '4. Crie um arquivo ZIP com todo o conteúdo',
          '5. Importe o ZIP no seu LMS',
        ],
      },
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('SCORM export failed', err);
    return NextResponse.json(
      { error: 'Falha ao gerar pacote SCORM' },
      { status: 500 }
    );
  }
};

export const POST = withPlanGuard(handlePost, {
  requiredPlan: 'pro',
  feature: 'scorm_export',
});

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'export-scorm-get', 20);
    if (rateLimitBlocked) return rateLimitBlocked;

  // Return supported SCORM versions and documentation
  return NextResponse.json({
    supportedVersions: ['1.2', '2004'],
    features: {
      '1.2': {
        name: 'SCORM 1.2',
        compatibility: 'Alta - Compatível com a maioria dos LMS',
        features: ['Tracking básico', 'Completude', 'Tempo de sessão', 'Bookmark'],
      },
      '2004': {
        name: 'SCORM 2004 4th Edition',
        compatibility: 'Média - LMS modernos',
        features: ['Tracking avançado', 'Sequenciamento', 'Objetivos', 'Interações'],
      },
    },
    documentation: 'https://docs.estudioiavideos.com.br/scorm-export',
  });
}

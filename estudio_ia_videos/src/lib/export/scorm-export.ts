/**
 * 📦 SCORM Export - Sistema de Exportação para LMS
 * 
 * Gera pacotes SCORM 1.2 e 2004 compatíveis com LMS corporativos
 * Inclui: manifest, API wrapper, tracking de progresso, quiz integration
 */

import JSZip from 'jszip';
import { Logger } from '@/lib/logger';

const logger = new Logger('scorm-export');

// =============================================================================
// Types
// =============================================================================

export type ScormVersion = '1.2' | '2004';

export interface ScormExportOptions {
  version: ScormVersion;
  courseTitle: string;
  courseDescription?: string;
  courseId: string;
  organizationName?: string;
  authorName?: string;
  videoUrl: string;
  videoDurationSeconds: number;
  passingScore?: number; // 0-100, default 80
  trackCompletion?: boolean;
  includeQuiz?: boolean;
  quizQuestions?: QuizQuestion[];
  thumbnail?: string; // Base64 or URL
  language?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false';
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  explanation?: string;
}

export interface ScormManifest {
  identifier: string;
  version: string;
  title: string;
  description: string;
  organization: string;
  resources: ScormResource[];
}

export interface ScormResource {
  identifier: string;
  type: string;
  href: string;
  files: string[];
}

// =============================================================================
// SCORM 1.2 Manifest Template
// =============================================================================

function generateScorm12Manifest(options: ScormExportOptions): string {
  const {
    courseId,
    courseTitle,
    courseDescription = '',
    organizationName = 'TecnicoCursos',
    authorName = 'Estúdio IA Vídeos',
  } = options;

  return `<?xml version="1.0" encoding="UTF-8"?>
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
    <lom xmlns="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1">
      <general>
        <title>
          <langstring xml:lang="pt-BR">${escapeXml(courseTitle)}</langstring>
        </title>
        <description>
          <langstring xml:lang="pt-BR">${escapeXml(courseDescription)}</langstring>
        </description>
        <language>pt-BR</language>
      </general>
      <lifecycle>
        <contribute>
          <role>
            <value>Author</value>
          </role>
          <centity>
            <vcard>BEGIN:VCARD\\nFN:${escapeXml(authorName)}\\nORG:${escapeXml(organizationName)}\\nEND:VCARD</vcard>
          </centity>
        </contribute>
      </lifecycle>
    </lom>
  </metadata>

  <organizations default="org_${courseId}">
    <organization identifier="org_${courseId}">
      <title>${escapeXml(courseTitle)}</title>
      <item identifier="item_${courseId}" identifierref="resource_${courseId}">
        <title>${escapeXml(courseTitle)}</title>
        <adlcp:masteryscore>${options.passingScore || 80}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="resource_${courseId}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-api.js"/>
      <file href="player.js"/>
      <file href="styles.css"/>
      <file href="video.mp4"/>
      ${options.includeQuiz ? '<file href="quiz.js"/>' : ''}
    </resource>
  </resources>

</manifest>`;
}

// =============================================================================
// SCORM 2004 Manifest Template
// =============================================================================

function generateScorm2004Manifest(options: ScormExportOptions): string {
  const {
    courseId,
    courseTitle,
    courseDescription = '',
    organizationName = 'TecnicoCursos',
    videoDurationSeconds,
  } = options;

  // Convert duration to ISO 8601 format (PT1H30M45S)
  const hours = Math.floor(videoDurationSeconds / 3600);
  const minutes = Math.floor((videoDurationSeconds % 3600) / 60);
  const seconds = videoDurationSeconds % 60;
  const isoDuration = `PT${hours}H${minutes}M${seconds}S`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${courseId}" version="1.0"
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
      <title>${escapeXml(courseTitle)}</title>
      <item identifier="item_${courseId}" identifierref="resource_${courseId}">
        <title>${escapeXml(courseTitle)}</title>
        <imsss:sequencing>
          <imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/>
        </imsss:sequencing>
      </item>
      <imsss:sequencing>
        <imsss:controlMode choice="true" flow="true"/>
      </imsss:sequencing>
    </organization>
  </organizations>

  <resources>
    <resource identifier="resource_${courseId}" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm-api.js"/>
      <file href="player.js"/>
      <file href="styles.css"/>
      <file href="video.mp4"/>
      ${options.includeQuiz ? '<file href="quiz.js"/>' : ''}
    </resource>
  </resources>

</manifest>`;
}

// =============================================================================
// SCORM API Wrapper (JavaScript)
// =============================================================================

function generateScormApiJs(version: ScormVersion): string {
  if (version === '1.2') {
    return `/**
 * SCORM 1.2 API Wrapper
 * Gerado automaticamente por Estúdio IA Vídeos
 */

var SCORM = (function() {
  var API = null;
  var initialized = false;
  var finished = false;

  function findAPI(win) {
    var attempts = 0;
    var maxAttempts = 500;
    
    while (!win.API && win.parent && win.parent !== win && attempts < maxAttempts) {
      win = win.parent;
      attempts++;
    }
    
    if (win.API) return win.API;
    
    if (win.opener && win.opener.API) return win.opener.API;
    
    return null;
  }

  function init() {
    if (initialized) return true;
    
    API = findAPI(window);
    
    if (!API) {
      logger.warn('SCORM API não encontrada. Executando em modo standalone.');
      return false;
    }
    
    var result = API.LMSInitialize("");
    initialized = (result === "true" || result === true);
    
    if (initialized) {
      API.LMSSetValue("cmi.core.lesson_status", "incomplete");
    }
    
    return initialized;
  }

  function terminate() {
    if (!initialized || finished) return true;
    
    var result = API.LMSFinish("");
    finished = (result === "true" || result === true);
    
    return finished;
  }

  function getValue(element) {
    if (!initialized) return "";
    return API.LMSGetValue(element);
  }

  function setValue(element, value) {
    if (!initialized) return false;
    var result = API.LMSSetValue(element, value);
    return (result === "true" || result === true);
  }

  function commit() {
    if (!initialized) return false;
    var result = API.LMSCommit("");
    return (result === "true" || result === true);
  }

  function setComplete(score) {
    if (!initialized) return;
    
    if (typeof score === 'number') {
      setValue("cmi.core.score.raw", score.toString());
      setValue("cmi.core.score.min", "0");
      setValue("cmi.core.score.max", "100");
    }
    
    setValue("cmi.core.lesson_status", "completed");
    commit();
  }

  function setProgress(percent) {
    if (!initialized) return;
    // SCORM 1.2 doesn't have progress, using suspend_data
    setValue("cmi.suspend_data", JSON.stringify({ progress: percent }));
    commit();
  }

  function getProgress() {
    if (!initialized) return 0;
    try {
      var data = JSON.parse(getValue("cmi.suspend_data") || "{}");
      return data.progress || 0;
    } catch (e) {
      return 0;
    }
  }

  return {
    init: init,
    terminate: terminate,
    getValue: getValue,
    setValue: setValue,
    commit: commit,
    setComplete: setComplete,
    setProgress: setProgress,
    getProgress: getProgress
  };
})();

// Auto-initialize
window.addEventListener('load', function() {
  SCORM.init();
});

window.addEventListener('beforeunload', function() {
  SCORM.terminate();
});
`;
  }

  // SCORM 2004
  return `/**
 * SCORM 2004 API Wrapper
 * Gerado automaticamente por Estúdio IA Vídeos
 */

var SCORM = (function() {
  var API = null;
  var initialized = false;
  var finished = false;

  function findAPI(win) {
    var attempts = 0;
    var maxAttempts = 500;
    
    while (!win.API_1484_11 && win.parent && win.parent !== win && attempts < maxAttempts) {
      win = win.parent;
      attempts++;
    }
    
    if (win.API_1484_11) return win.API_1484_11;
    
    if (win.opener && win.opener.API_1484_11) return win.opener.API_1484_11;
    
    return null;
  }

  function init() {
    if (initialized) return true;
    
    API = findAPI(window);
    
    if (!API) {
      logger.warn('SCORM 2004 API não encontrada. Executando em modo standalone.');
      return false;
    }
    
    var result = API.Initialize("");
    initialized = (result === "true" || result === true);
    
    if (initialized) {
      API.SetValue("cmi.completion_status", "incomplete");
      API.SetValue("cmi.success_status", "unknown");
    }
    
    return initialized;
  }

  function terminate() {
    if (!initialized || finished) return true;
    
    var result = API.Terminate("");
    finished = (result === "true" || result === true);
    
    return finished;
  }

  function getValue(element) {
    if (!initialized) return "";
    return API.GetValue(element);
  }

  function setValue(element, value) {
    if (!initialized) return false;
    var result = API.SetValue(element, value);
    return (result === "true" || result === true);
  }

  function commit() {
    if (!initialized) return false;
    var result = API.Commit("");
    return (result === "true" || result === true);
  }

  function setComplete(score, passed) {
    if (!initialized) return;
    
    if (typeof score === 'number') {
      setValue("cmi.score.scaled", (score / 100).toString());
      setValue("cmi.score.raw", score.toString());
      setValue("cmi.score.min", "0");
      setValue("cmi.score.max", "100");
    }
    
    setValue("cmi.completion_status", "completed");
    setValue("cmi.success_status", passed ? "passed" : "failed");
    commit();
  }

  function setProgress(percent) {
    if (!initialized) return;
    setValue("cmi.progress_measure", (percent / 100).toString());
    commit();
  }

  function getProgress() {
    if (!initialized) return 0;
    var progress = getValue("cmi.progress_measure");
    return progress ? parseFloat(progress) * 100 : 0;
  }

  return {
    init: init,
    terminate: terminate,
    getValue: getValue,
    setValue: setValue,
    commit: commit,
    setComplete: setComplete,
    setProgress: setProgress,
    getProgress: getProgress
  };
})();

// Auto-initialize
window.addEventListener('load', function() {
  SCORM.init();
});

window.addEventListener('beforeunload', function() {
  SCORM.terminate();
});
`;
}

// =============================================================================
// Player HTML Template
// =============================================================================

function generatePlayerHtml(options: ScormExportOptions): string {
  const { courseTitle, includeQuiz, passingScore = 80 } = options;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(courseTitle)}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="player-container">
    <header class="player-header">
      <h1>${escapeXml(courseTitle)}</h1>
      <div class="progress-container">
        <div class="progress-bar" id="progressBar"></div>
        <span class="progress-text" id="progressText">0%</span>
      </div>
    </header>

    <main class="player-content">
      <div class="video-container" id="videoSection">
        <video id="videoPlayer" controls>
          <source src="video.mp4" type="video/mp4">
          Seu navegador não suporta vídeo HTML5.
        </video>
      </div>

      ${includeQuiz ? `
      <div class="quiz-container" id="quizSection" style="display: none;">
        <div id="quizContent"></div>
        <div class="quiz-navigation">
          <button id="prevQuestion" class="btn btn-secondary" disabled>Anterior</button>
          <span id="questionCounter">1/10</span>
          <button id="nextQuestion" class="btn btn-primary">Próxima</button>
        </div>
        <div class="quiz-result" id="quizResult" style="display: none;">
          <h2>Resultado</h2>
          <p id="resultScore"></p>
          <p id="resultStatus"></p>
          <button id="retryQuiz" class="btn btn-primary" style="display: none;">Tentar Novamente</button>
        </div>
      </div>
      ` : ''}
    </main>

    <footer class="player-footer">
      <p>Treinamento gerado por <strong>Estúdio IA Vídeos</strong></p>
    </footer>
  </div>

  <script src="scorm-api.js"></script>
  <script src="player.js"></script>
  ${includeQuiz ? '<script src="quiz.js"></script>' : ''}
  <script>
    var CONFIG = {
      passingScore: ${passingScore},
      includeQuiz: ${includeQuiz},
      trackCompletion: true
    };
    
    document.addEventListener('DOMContentLoaded', function() {
      initPlayer(CONFIG);
    });
  </script>
</body>
</html>`;
}

// =============================================================================
// Player JavaScript
// =============================================================================

function generatePlayerJs(): string {
  return `/**
 * Video Player with SCORM Tracking
 * Gerado automaticamente por Estúdio IA Vídeos
 */

function initPlayer(config) {
  var video = document.getElementById('videoPlayer');
  var progressBar = document.getElementById('progressBar');
  var progressText = document.getElementById('progressText');
  var watchedPercent = 0;
  var maxWatched = 0;

  // Restore progress
  var savedProgress = SCORM.getProgress();
  if (savedProgress > 0) {
    maxWatched = savedProgress;
    updateProgressUI(maxWatched);
  }

  // Track video progress
  video.addEventListener('timeupdate', function() {
    var currentPercent = (video.currentTime / video.duration) * 100;
    
    // Only count forward progress (no skipping)
    if (currentPercent > maxWatched && currentPercent <= maxWatched + 2) {
      maxWatched = currentPercent;
      SCORM.setProgress(Math.round(maxWatched));
      updateProgressUI(maxWatched);
    }
  });

  // Video ended
  video.addEventListener('ended', function() {
    maxWatched = 100;
    SCORM.setProgress(100);
    updateProgressUI(100);
    
    if (config.includeQuiz) {
      showQuiz();
    } else {
      SCORM.setComplete(100, true);
      showCompletionMessage();
    }
  });

  function updateProgressUI(percent) {
    progressBar.style.width = percent + '%';
    progressText.textContent = Math.round(percent) + '%';
  }

  function showQuiz() {
    document.getElementById('videoSection').style.display = 'none';
    document.getElementById('quizSection').style.display = 'block';
    if (typeof initQuiz === 'function') {
      initQuiz(config);
    }
  }

  function showCompletionMessage() {
    var container = document.querySelector('.player-content');
    container.innerHTML = '<div class="completion-message">' +
      '<h2>✅ Treinamento Concluído!</h2>' +
      '<p>Parabéns! Você completou este treinamento com sucesso.</p>' +
      '</div>';
  }

  // Expose for quiz
  window.completeTraining = function(score, passed) {
    SCORM.setComplete(score, passed);
    if (!passed) {
      document.getElementById('retryQuiz').style.display = 'inline-block';
    }
  };
}
`;
}

// =============================================================================
// Quiz JavaScript
// =============================================================================

function generateQuizJs(questions: QuizQuestion[]): string {
  return `/**
 * Quiz Module for SCORM Training
 * Gerado automaticamente por Estúdio IA Vídeos
 */

var QUIZ_QUESTIONS = ${JSON.stringify(questions, null, 2)};

var currentQuestion = 0;
var answers = [];
var quizConfig = {};

function initQuiz(config) {
  quizConfig = config;
  answers = new Array(QUIZ_QUESTIONS.length).fill(null);
  renderQuestion();
  updateNavigation();
}

function renderQuestion() {
  var q = QUIZ_QUESTIONS[currentQuestion];
  var html = '<div class="question">';
  html += '<h3>Pergunta ' + (currentQuestion + 1) + ' de ' + QUIZ_QUESTIONS.length + '</h3>';
  html += '<p class="question-text">' + q.question + '</p>';
  html += '<div class="options">';
  
  q.options.forEach(function(option, i) {
    var checked = answers[currentQuestion] === i ? 'checked' : '';
    html += '<label class="option">';
    html += '<input type="radio" name="answer" value="' + i + '" ' + checked + ' onchange="selectAnswer(' + i + ')">';
    html += '<span>' + option + '</span>';
    html += '</label>';
  });
  
  html += '</div></div>';
  document.getElementById('quizContent').innerHTML = html;
  
  document.getElementById('questionCounter').textContent = 
    (currentQuestion + 1) + '/' + QUIZ_QUESTIONS.length;
}

function selectAnswer(index) {
  answers[currentQuestion] = index;
}

function updateNavigation() {
  document.getElementById('prevQuestion').disabled = currentQuestion === 0;
  
  var nextBtn = document.getElementById('nextQuestion');
  if (currentQuestion === QUIZ_QUESTIONS.length - 1) {
    nextBtn.textContent = 'Finalizar';
    nextBtn.onclick = finishQuiz;
  } else {
    nextBtn.textContent = 'Próxima';
    nextBtn.onclick = nextQuestion;
  }
}

function nextQuestion() {
  if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
    currentQuestion++;
    renderQuestion();
    updateNavigation();
  }
}

function prevQuestion() {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderQuestion();
    updateNavigation();
  }
}

function finishQuiz() {
  var correct = 0;
  QUIZ_QUESTIONS.forEach(function(q, i) {
    if (answers[i] === q.correctAnswer) {
      correct++;
    }
  });
  
  var score = Math.round((correct / QUIZ_QUESTIONS.length) * 100);
  var passed = score >= quizConfig.passingScore;
  
  document.getElementById('quizContent').style.display = 'none';
  document.querySelector('.quiz-navigation').style.display = 'none';
  
  var resultDiv = document.getElementById('quizResult');
  resultDiv.style.display = 'block';
  
  document.getElementById('resultScore').textContent = 
    'Você acertou ' + correct + ' de ' + QUIZ_QUESTIONS.length + ' questões (' + score + '%)';
  
  if (passed) {
    document.getElementById('resultStatus').innerHTML = 
      '<span class="status-passed">✅ Aprovado! Parabéns!</span>';
  } else {
    document.getElementById('resultStatus').innerHTML = 
      '<span class="status-failed">❌ Não atingiu a nota mínima de ' + quizConfig.passingScore + '%</span>';
  }
  
  window.completeTraining(score, passed);
}

function retryQuiz() {
  currentQuestion = 0;
  answers = new Array(QUIZ_QUESTIONS.length).fill(null);
  
  document.getElementById('quizContent').style.display = 'block';
  document.querySelector('.quiz-navigation').style.display = 'flex';
  document.getElementById('quizResult').style.display = 'none';
  document.getElementById('retryQuiz').style.display = 'none';
  
  renderQuestion();
  updateNavigation();
}

// Event listeners
document.getElementById('prevQuestion').addEventListener('click', prevQuestion);
document.getElementById('nextQuestion').addEventListener('click', nextQuestion);
document.getElementById('retryQuiz').addEventListener('click', retryQuiz);
`;
}

// =============================================================================
// Styles CSS
// =============================================================================

function generateStylesCss(): string {
  return `/**
 * SCORM Player Styles
 * Gerado automaticamente por Estúdio IA Vídeos
 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.player-container {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 960px;
  width: 100%;
  overflow: hidden;
}

.player-header {
  padding: 24px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.player-header h1 {
  font-size: 1.5rem;
  color: #1e293b;
  margin-bottom: 16px;
}

.progress-container {
  background: #e2e8f0;
  border-radius: 9999px;
  height: 8px;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  background: linear-gradient(90deg, #667eea, #764ba2);
  height: 100%;
  width: 0%;
  transition: width 0.3s ease;
  border-radius: 9999px;
}

.progress-text {
  position: absolute;
  right: 0;
  top: -24px;
  font-size: 0.875rem;
  color: #64748b;
}

.player-content {
  padding: 24px;
}

.video-container {
  position: relative;
  background: #0f172a;
  border-radius: 12px;
  overflow: hidden;
}

video {
  width: 100%;
  display: block;
}

.quiz-container {
  padding: 20px;
}

.question {
  margin-bottom: 24px;
}

.question h3 {
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.question-text {
  font-size: 1.25rem;
  color: #1e293b;
  margin-bottom: 20px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option:hover {
  border-color: #667eea;
  background: #f8fafc;
}

.option input {
  margin-right: 12px;
  width: 20px;
  height: 20px;
}

.option input:checked + span {
  color: #667eea;
  font-weight: 600;
}

.quiz-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: linear-gradient(90deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
}

.btn-secondary:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quiz-result {
  text-align: center;
  padding: 40px;
}

.quiz-result h2 {
  font-size: 1.5rem;
  margin-bottom: 16px;
}

.status-passed {
  color: #22c55e;
  font-size: 1.25rem;
}

.status-failed {
  color: #ef4444;
  font-size: 1.25rem;
}

.completion-message {
  text-align: center;
  padding: 60px 20px;
}

.completion-message h2 {
  font-size: 2rem;
  color: #22c55e;
  margin-bottom: 16px;
}

.player-footer {
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  body {
    padding: 10px;
  }
  
  .player-header h1 {
    font-size: 1.25rem;
  }
  
  .question-text {
    font-size: 1rem;
  }
}
`;
}

// =============================================================================
// Main Export Function
// =============================================================================

export async function generateScormPackage(options: ScormExportOptions): Promise<Blob> {
  logger.info('Gerando pacote SCORM', { 
    version: options.version, 
    courseId: options.courseId,
    includeQuiz: options.includeQuiz 
  });

  const zip = new JSZip();

  // Generate manifest
  const manifest = options.version === '1.2' 
    ? generateScorm12Manifest(options)
    : generateScorm2004Manifest(options);
  zip.file('imsmanifest.xml', manifest);

  // Generate SCORM API wrapper
  zip.file('scorm-api.js', generateScormApiJs(options.version));

  // Generate player HTML
  zip.file('index.html', generatePlayerHtml(options));

  // Generate player JS
  zip.file('player.js', generatePlayerJs());

  // Generate styles
  zip.file('styles.css', generateStylesCss());

  // Generate quiz if included
  if (options.includeQuiz && options.quizQuestions?.length) {
    zip.file('quiz.js', generateQuizJs(options.quizQuestions));
  }

  // Note: Video file needs to be added separately
  // The caller should add the video file to the zip

  // Generate zip
  const blob = await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  logger.info('Pacote SCORM gerado com sucesso', { 
    size: blob.size,
    version: options.version 
  });

  return blob;
}

/**
 * Add video file to existing SCORM package
 */
export async function addVideoToScormPackage(
  packageBlob: Blob,
  videoBlob: Blob
): Promise<Blob> {
  const zip = await JSZip.loadAsync(packageBlob);
  zip.file('video.mp4', videoBlob);
  
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// =============================================================================
// Exports
// =============================================================================

export {
  generateScorm12Manifest,
  generateScorm2004Manifest,
  generateScormApiJs,
  generatePlayerHtml,
  generatePlayerJs,
  generateQuizJs,
  generateStylesCss,
};

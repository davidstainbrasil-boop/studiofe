#!/usr/bin/env node

const THREE = require('three');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  options[key] = value;
}

console.log('Avatar Frame Generator Started');
console.log('Options:', options);

async function generateAvatarFrames() {
  try {
    const {
      avatarId,
      script,
      duration = 60,
      resolution = '1920x1080',
      outputDir,
      fps = 30
    } = options;

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Parse resolution
    const [width, height] = resolution.split('x').map(Number);
    const totalFrames = Math.floor(duration * fps);

    console.log(`Generating ${totalFrames} frames at ${resolution} (${fps}fps)`);

    // Setup Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    
    // Setup renderer with canvas
    const canvas = createCanvas(width, height);
    const renderer = new THREE.WebGLRenderer({ 
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x1a1a2e, 1);

    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create avatar based on ID
    const avatar = await createAvatar(avatarId, scene);
    
    // Position camera
    camera.position.z = 5;
    camera.lookAt(0, 0, 0);

    // Generate frames
    const words = script.split(' ');
    const wordsPerFrame = Math.ceil(words.length / totalFrames);
    
    for (let frame = 0; frame < totalFrames; frame++) {
      // Calculate animation parameters
      const progress = frame / totalFrames;
      const time = frame / fps;

      // Update avatar animation
      await updateAvatarAnimation(avatar, progress, time, words, frame, wordsPerFrame);

      // Render frame
      renderer.render(scene, camera);

      // Save frame
      const framePath = path.join(outputDir, `frame_${String(frame).padStart(6, '0')}.png`);
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(framePath, buffer);

      // Progress update
      if (frame % Math.floor(totalFrames / 10) === 0) {
        const progressPercent = Math.round((frame / totalFrames) * 100);
        console.log(`Progress: ${progressPercent}% (${frame}/${totalFrames} frames)`);
      }
    }

    console.log('Avatar frames generated successfully!');
    console.log(`Output directory: ${outputDir}`);
    
    // Cleanup
    renderer.dispose();
    
  } catch (error) {
    console.error('Error generating avatar frames:', error);
    process.exit(1);
  }
}

async function createAvatar(avatarId, scene) {
  console.log(`Creating avatar: ${avatarId}`);
  
  // Create avatar geometry and material based on ID
  let geometry, material, mesh;

  switch (avatarId) {
    case 'professional-male':
      // Professional male avatar
      geometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
      material = new THREE.MeshLambertMaterial({ 
        color: 0x4a90e2,
        emissive: 0x1a1a2e,
        emissiveIntensity: 0.1
      });
      break;
      
    case 'professional-female':
      // Professional female avatar
      geometry = new THREE.CapsuleGeometry(0.45, 1.6, 4, 8);
      material = new THREE.MeshLambertMaterial({ 
        color: 0xe24a90,
        emissive: 0x2e1a1a,
        emissiveIntensity: 0.1
      });
      break;
      
    case 'casual-male':
      // Casual male avatar
      geometry = new THREE.BoxGeometry(1, 2, 0.8);
      material = new THREE.MeshLambertMaterial({ 
        color: 0x90e24a,
        emissive: 0x1a2e1a,
        emissiveIntensity: 0.1
      });
      break;
      
    default:
      // Default avatar
      geometry = new THREE.SphereGeometry(1, 32, 32);
      material = new THREE.MeshLambertMaterial({ 
        color: 0x2a4ae2,
        emissive: 0x1a1a2e,
        emissiveIntensity: 0.1
      });
  }

  mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, 0);
  scene.add(mesh);

  // Add head
  const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0, 1.2, 0);
  mesh.add(head);

  // Add eyes
  const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.1, 1.25, 0.25);
  head.add(leftEye);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.1, 1.25, 0.25);
  head.add(rightEye);

  return {
    mesh,
    head,
    leftEye,
    rightEye,
    originalPosition: mesh.position.clone()
  };
}

async function updateAvatarAnimation(avatar, progress, time, words, frame, wordsPerFrame) {
  const { mesh, head, leftEye, rightEye } = avatar;

  // Subtle breathing animation
  const breathingScale = 1 + Math.sin(time * 2) * 0.02;
  mesh.scale.set(breathingScale, breathingScale, breathingScale);

  // Gentle swaying
  const swayAmount = Math.sin(time * 0.5) * 0.05;
  mesh.rotation.z = swayAmount;

  // Head movement based on speech
  const currentWordIndex = Math.min(frame * wordsPerFrame, words.length - 1);
  const speechIntensity = words[currentWordIndex] ? 
    words[currentWordIndex].length / 10 : 0;
  
  // Mouth movement (simplified)
  const mouthOpenness = Math.sin(time * 8) * speechIntensity * 0.1;
  head.position.y = 1.2 + mouthOpenness * 0.05;

  // Eye tracking (subtle)
  const eyeMovement = Math.sin(time * 0.3) * 0.02;
  leftEye.position.x = -0.1 + eyeMovement;
  rightEye.position.x = 0.1 + eyeMovement;

  // Hand gestures (simplified)
  const gestureIntensity = Math.sin(time * 3) * speechIntensity * 0.1;
  mesh.rotation.y = gestureIntensity;

  // Idle animation when not speaking
  if (speechIntensity < 0.1) {
    const idleMovement = Math.sin(time * 0.7) * 0.02;
    mesh.position.x = avatar.originalPosition.x + idleMovement;
  }
}

// Run the generator
if (require.main === module) {
  generateAvatarFrames().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { generateAvatarFrames, createAvatar, updateAvatarAnimation };
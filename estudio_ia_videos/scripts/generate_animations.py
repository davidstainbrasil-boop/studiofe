#!/usr/bin/env python3
"""
Generate animations for avatar models
Processes audio to create lip-sync and gestures
"""

import json
import sys
import os
import numpy as np
from pathlib import Path

class AnimationGenerator:
    def __init__(self):
        self.fps = 25
        self.frame_time = 1.0 / self.fps
    
    def analyze_audio_features(self, audio_path):
        """
        Analyze audio file to extract features for animation
        
        Args:
            audio_path: str - path to audio file
        
        Returns:
            dict with audio features
        """
        # Mock audio analysis for now - in production would use librosa or similar
        # This would analyze amplitude, frequency, onset detection, etc.
        
        # Generate mock features for 5 seconds of audio
        duration = 5.0
        num_frames = int(duration * self.fps)
        
        # Simulate amplitude envelope
        time_points = np.linspace(0, duration, num_frames)
        base_amplitude = 0.3 + 0.2 * np.sin(time_points * 2)  # Speaking rhythm
        
        # Add some random variation for naturalness
        amplitude = base_amplitude + 0.1 * np.random.random(num_frames)
        amplitude = np.clip(amplitude, 0, 1)
        
        # Mock frequency bands (for different mouth shapes)
        freq_bands = {
            'low': amplitude * 0.8,    # Low frequencies -> wider mouth
            'mid': amplitude * 0.6,     # Mid frequencies -> normal mouth
            'high': amplitude * 0.4     # High frequencies -> tighter mouth
        }
        
        # Onset detection (when speech starts/stops)
        onsets = []
        for i in range(1, len(amplitude)):
            if amplitude[i] - amplitude[i-1] > 0.2:  # Sudden increase
                onsets.append(i / self.fps)
        
        return {
            'duration': duration,
            'fps': self.fps,
            'num_frames': num_frames,
            'amplitudes': amplitude.tolist(),
            'frequency_bands': {k: v.tolist() for k, v in freq_bands.items()},
            'onsets': onsets
        }
    
    def generate_lip_sync(self, audio_features):
        """
        Generate lip sync animation based on audio features
        
        Args:
            audio_features: dict from analyze_audio_features
        
        Returns:
            list of animation frames
        """
        amplitudes = audio_features['amplitudes']
        freq_low = audio_features['frequency_bands']['low']
        freq_mid = audio_features['frequency_bands']['mid']
        
        frames = []
        
        for i, amp in enumerate(amplitudes):
            # Map audio features to blend shapes
            frame = {
                'time': i * self.frame_time,
                'blend_shapes': {
                    # Mouth shapes based on audio amplitude and frequency
                    'jaw_open': amp * 0.4 + freq_low[i] * 0.2,  # More open for loud/low sounds
                    'mouth_wide': freq_low[i] * 0.3,
                    'mouth_narrow': freq_mid[i] * 0.2,
                    
                    # Basic expressions
                    'mouth_smile': 0.1,  # Slight default smile
                    'mouth_frown': 0.0,
                    
                    # Tongue position (mock)
                    'tongue_out': 0.1 * amp if amp > 0.7 else 0.0,
                    
                    # Eye blinks (random but natural)
                    'eyes_blink': 0.8 if (i % 150 == 0 or (i % 75 == 0 and np.random.random() > 0.7)) else 0.0,
                    'eyes_look_left': 0.05 * np.sin(i * 0.02),
                    'eyes_look_right': -0.05 * np.sin(i * 0.02),
                    
                    # Head movement (subtle)
                    'head_nod': 0.03 * np.sin(i * 0.1),
                    'head_tilt': 0.02 * np.cos(i * 0.15),
                    
                    # Eyebrows for expression
                    'eyebrows_raise': 0.1 if i % 200 == 0 else 0.05,
                    'eyebrows_furrow': 0.0
                }
            }
            frames.append(frame)
        
        return frames
    
    def generate_gestures(self, audio_features, gesture_style='natural'):
        """
        Generate hand and body gestures synchronized with speech
        
        Args:
            audio_features: dict from analyze_audio_features
            gesture_style: str - 'natural', 'energetic', 'calm'
        
        Returns:
            list of gesture frames
        """
        amplitudes = audio_features['amplitudes']
        onsets = audio_features['onsets']
        
        frames = []
        
        # Style parameters
        if gesture_style == 'energetic':
            gesture_intensity = 0.4
            gesture_frequency = 0.3
        elif gesture_style == 'calm':
            gesture_intensity = 0.1
            gesture_frequency = 0.05
        else:  # natural
            gesture_intensity = 0.2
            gesture_frequency = 0.15
        
        for i, amp in enumerate(amplitudes):
            # Hand gestures
            frame = {
                'time': i * self.frame_time,
                'gestures': {
                    # Right hand
                    'right_hand_x': gesture_intensity * np.sin(i * gesture_frequency),
                    'right_hand_y': gesture_intensity * 0.5 * np.cos(i * gesture_frequency * 0.7),
                    'right_hand_open': amp * 0.3,
                    
                    # Left hand
                    'left_hand_x': -gesture_intensity * np.sin(i * gesture_frequency * 1.2),
                    'left_hand_y': gesture_intensity * 0.3 * np.cos(i * gesture_frequency * 0.8),
                    'left_hand_open': amp * 0.2,
                    
                    # Body sway
                    'body_sway': gesture_intensity * 0.1 * np.sin(i * gesture_frequency * 0.3),
                    
                    # Shoulder movement
                    'shoulders_raise': gesture_intensity * 0.1 * abs(np.sin(i * gesture_frequency * 0.5)),
                    
                    # Emphasis gestures on speech onsets
                    'emphasis_right': 0.3 if any(abs(onset - i/self.fps) < 0.2 for onset in onsets) else 0.0,
                    'emphasis_left': 0.2 if any(abs(onset - i/self.fps) < 0.3 for onset in onsets) else 0.0
                }
            }
            frames.append(frame)
        
        return frames
    
    def combine_animations(self, lip_sync_frames, gesture_frames):
        """
        Combine lip sync and gesture animations
        
        Args:
            lip_sync_frames: list from generate_lip_sync
            gesture_frames: list from generate_gestures
        
        Returns:
            combined animation frames
        """
        combined = []
        
        for lip_frame, gesture_frame in zip(lip_sync_frames, gesture_frames):
            combined_frame = {
                'time': lip_frame['time'],
                'blend_shapes': lip_frame['blend_shapes'],
                'gestures': gesture_frame['gestures']
            }
            combined.append(combined_frame)
        
        return combined

def generate_animations(config, output_path):
    """
    Generate complete animation set for avatar
    
    Args:
        config: dict with animation configuration
        output_path: str - where to save the animation file
    
    Returns:
        dict with success status and metadata
    """
    try:
        generator = AnimationGenerator()
        
        # Get audio file path
        audio_path = config.get('audio_path')
        if not audio_path or not os.path.exists(audio_path):
            # Generate mock animation without audio
            audio_features = {
                'duration': config.get('duration', 5.0),
                'fps': generator.fps,
                'num_frames': int(config.get('duration', 5.0) * generator.fps),
                'amplitudes': [0.5] * int(config.get('duration', 5.0) * generator.fps),
                'frequency_bands': {
                    'low': [0.4] * int(config.get('duration', 5.0) * generator.fps),
                    'mid': [0.3] * int(config.get('duration', 5.0) * generator.fps),
                    'high': [0.2] * int(config.get('duration', 5.0) * generator.fps)
                },
                'onsets': []
            }
        else:
            audio_features = generator.analyze_audio_features(audio_path)
        
        # Generate animations
        lip_sync_frames = generator.generate_lip_sync(audio_features)
        gesture_style = config.get('gesture_style', 'natural')
        gesture_frames = generator.generate_gestures(audio_features, gesture_style)
        
        # Combine animations
        combined_frames = generator.combine_animations(lip_sync_frames, gesture_frames)
        
        # Prepare output data
        animation_data = {
            'avatar_id': config.get('avatar_id', 'default'),
            'animation_type': 'speech_with_gestures',
            'duration': audio_features['duration'],
            'fps': generator.fps,
            'total_frames': len(combined_frames),
            'frames': combined_frames,
            'metadata': {
                'gesture_style': gesture_style,
                'audio_source': audio_path if audio_path else 'generated',
                'generated_at': str(np.datetime64('now'))
            }
        }
        
        # Save animation
        with open(output_path, 'w') as f:
            json.dump(animation_data, f, indent=2)
        
        return {
            'success': True,
            'output_path': output_path,
            'avatar_id': config.get('avatar_id', 'default'),
            'duration': audio_features['duration'],
            'total_frames': len(combined_frames),
            'animation_type': 'speech_with_gestures'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) != 3:
        print("Usage: python generate_animations.py <input_json> <output_path>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        with open(input_file, 'r') as f:
            config = json.load(f)
        
        result = generate_animations(config, output_path)
        
        if result['success']:
            print(json.dumps(result))
            sys.exit(0)
        else:
            print(json.dumps(result), file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        error_result = {'success': False, 'error': str(e)}
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
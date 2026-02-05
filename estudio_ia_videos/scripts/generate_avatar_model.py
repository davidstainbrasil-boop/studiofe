#!/usr/bin/env python3
"""
Generate avatar model and animations
Used for AI avatar rendering in videos
"""

import json
import sys
import os
import numpy as np
from pathlib import Path

class AvatarModel:
    def __init__(self, avatar_id, model_type="basic"):
        self.avatar_id = avatar_id
        self.model_type = model_type
        self.model_data = {
            'id': avatar_id,
            'type': model_type,
            'vertices': [],
            'faces': [],
            'animations': {}
        }
    
    def generate_basic_mesh(self):
        """Generate a basic humanoid mesh"""
        # Simple placeholder geometry
        vertices = [
            # Head (approximate sphere)
            [0, 150, 0], [50, 150, 0], [0, 200, 0], [-50, 150, 0],
            [0, 150, 50], [50, 150, 50], [0, 200, 50], [-50, 150, 50],
            
            # Body (approximate box)
            [-30, 100, -20], [30, 100, -20], [30, 150, -20], [-30, 150, -20],
            [-30, 100, 20], [30, 100, 20], [30, 150, 20], [-30, 150, 20],
            
            # Arms
            [35, 140, 0], [60, 140, 0], [60, 100, 0], [35, 100, 0],
            [-35, 140, 0], [-60, 140, 0], [-60, 100, 0], [-35, 100, 0],
        ]
        
        faces = [
            # Head faces
            [0, 1, 2], [0, 2, 3], [1, 5, 6], [1, 6, 2],
            [5, 4, 7], [5, 7, 6], [4, 0, 3], [4, 3, 7],
            
            # Body faces
            [8, 9, 10], [8, 10, 11], [12, 15, 14], [12, 14, 13],
            [9, 13, 14], [9, 14, 10], [8, 12, 15], [8, 15, 11],
            
            # Arm faces
            [16, 17, 18], [16, 18, 19], [20, 23, 22], [20, 22, 21],
        ]
        
        self.model_data['vertices'] = vertices
        self.model_data['faces'] = faces
    
    def generate_speaking_animation(self, audio_features):
        """Generate basic speaking animation based on audio features"""
        frames = []
        
        # Basic mouth movement based on audio amplitude
        for i, amplitude in enumerate(audio_features.get('amplitudes', [0.5] * 100)):
            frame = {
                'time': i * 0.04,  # 25 FPS
                'blend_shapes': {
                    'jaw_open': amplitude * 0.3,
                    'mouth_smile': 0.1,
                    'eyes_blink': 0.01 if i % 150 == 0 else 0.0
                }
            }
            frames.append(frame)
        
        self.model_data['animations']['speaking'] = frames
        return frames
    
    def generate_idle_animation(self, duration=10):
        """Generate subtle idle animation"""
        frames = []
        fps = 25
        total_frames = duration * fps
        
        for i in range(total_frames):
            t = i / fps
            frame = {
                'time': i * 0.04,
                'blend_shapes': {
                    'eyes_blink': 0.1 if abs(np.sin(t * 3)) > 0.95 else 0.0,
                    'head_tilt': 0.05 * np.sin(t * 0.5),
                    'breathing': 0.02 * np.sin(t * 2)
                }
            }
            frames.append(frame)
        
        self.model_data['animations']['idle'] = frames
        return frames
    
    def save_model(self, output_path):
        """Save model data as JSON"""
        with open(output_path, 'w') as f:
            json.dump(self.model_data, f, indent=2)
        
        return {
            'success': True,
            'output_path': output_path,
            'model_id': self.avatar_id,
            'vertices_count': len(self.model_data['vertices']),
            'faces_count': len(self.model_data['faces']),
            'animations': list(self.model_data['animations'].keys())
        }

def generate_avatar_model(config, output_path):
    """
    Generate avatar model from configuration
    
    Args:
        config: dict with avatar configuration
        output_path: str - where to save the model file
    
    Returns:
        dict with success status and metadata
    """
    try:
        avatar_id = config.get('id', 'default_avatar')
        model_type = config.get('type', 'basic')
        
        # Create avatar model
        avatar = AvatarModel(avatar_id, model_type)
        
        # Generate basic mesh
        avatar.generate_basic_mesh()
        
        # Generate animations
        if config.get('generate_speaking', True):
            # Mock audio features for now
            audio_features = {
                'amplitudes': [0.5 + 0.3 * np.sin(i * 0.1) for i in range(100)]
            }
            avatar.generate_speaking_animation(audio_features)
        
        if config.get('generate_idle', True):
            avatar.generate_idle_animation()
        
        # Save model
        result = avatar.save_model(output_path)
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) != 3:
        print("Usage: python generate_avatar_model.py <input_json> <output_path>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        with open(input_file, 'r') as f:
            config = json.load(f)
        
        result = generate_avatar_model(config, output_path)
        
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
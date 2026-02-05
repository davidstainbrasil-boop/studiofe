#!/usr/bin/env python3
"""
Render video using Blender (fallback for avatar rendering)
Used when Unreal Engine is not available
"""

import json
import sys
import os
import subprocess
import tempfile
from pathlib import Path

class BlenderRenderer:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix='blender_render_')
        
    def create_blender_scene(self, scene_config, output_path):
        """
        Create a basic Blender scene for rendering
        
        Args:
            scene_config: dict with scene configuration
            output_path: str - path for the rendered video
        """
        # Generate a simple Python script for Blender
        blender_script = f"""
import bpy
import json
import math

# Clear existing scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Set up render settings
scene = bpy.context.scene
scene.render.resolution_x = {scene_config.get('resolution', {}).get('width', 1920)}
scene.render.resolution_y = {scene_config.get('resolution', {}).get('height', 1080)}
scene.render.resolution_percentage = 100
scene.render.fps = {scene_config.get('fps', 25)}
scene.render.image_settings.file_format = 'FFMPEG'
scene.render.ffmpeg.format = 'MPEG4'
scene.render.ffmpeg.codec = 'H264'
scene.render.ffmpeg.constant_rate_factor = 'MEDIUM'
scene.render.filepath = '{output_path}'

# Add camera
bpy.ops.object.camera_add(location=(0, -5, 1))
camera = bpy.context.active_object
camera.rotation_euler[1] = math.radians(0)
scene.camera = camera

# Add lighting
bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
sun = bpy.context.active_object
sun.data.energy = 5

bpy.ops.object.light_add(type='AREA', location=(-3, -2, 3))
area = bpy.context.active_object
area.data.energy = 3

# Add a simple avatar (placeholder cube that will be animated)
bpy.ops.mesh.primitive_cube_add(location=(0, 0, 1))
avatar = bpy.context.active_object
avatar.scale = (1, 1, 2)
avatar.name = 'Avatar'

# Add material to avatar
mat = bpy.data.materials.new(name="AvatarMaterial")
avatar.data.materials.append(mat)
mat.diffuse_color = (0.8, 0.6, 0.9, 1.0)

# Animation data from config
frames_data = {json.dumps(scene_config.get('frames', []))}

if frames_data:
    # Set animation keyframes
    for frame_data in frames_data:
        frame_num = int(frame_data['time'] * {scene_config.get('fps', 25)})
        
        # Set current frame
        scene.frame_set(frame_num)
        
        # Animate position (simple example)
        gestures = frame_data.get('gestures', {{}})
        if 'right_hand_x' in gestures:
            avatar.location.x = gestures['right_hand_x'] * 0.5
        if 'right_hand_y' in gestures:
            avatar.location.z = 1 + gestures['right_hand_y'] * 0.3
        
        # Insert keyframe
        avatar.keyframe_insert(data_path="location", frame=frame_num)

# Set frame range
if frames_data:
    scene.frame_start = 0
    scene.frame_end = len(frames_data) - 1
else:
    scene.frame_start = 0
    scene.frame_end = {scene_config.get('duration', 5) * scene_config.get('fps', 25)} - 1

# Render animation
bpy.ops.render.render(animation=True)
"""
        
        return blender_script
    
    def render_with_blender(self, scene_config, output_path):
        """
        Render video using Blender
        
        Args:
            scene_config: dict with scene configuration
            output_path: str - path for the rendered video
        
        Returns:
            dict with success status and metadata
        """
        try:
            # Check if Blender is available
            blender_path = self.find_blender_executable()
            if not blender_path:
                return {
                    'success': False,
                    'error': 'Blender executable not found'
                }
            
            # Generate Blender script
            script_content = self.create_blender_scene(scene_config, output_path)
            
            # Save script to temporary file
            script_path = os.path.join(self.temp_dir, 'blender_scene.py')
            with open(script_path, 'w') as f:
                f.write(script_content)
            
            # Execute Blender
            cmd = [
                blender_path,
                '--background',
                '--python', script_path
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0 and os.path.exists(output_path):
                return {
                    'success': True,
                    'output_path': output_path,
                    'file_size': os.path.getsize(output_path),
                    'render_time': None,  # Could extract from Blender output
                    'blender_version': self.get_blender_version(blender_path)
                }
            else:
                return {
                    'success': False,
                    'error': f'Blender rendering failed: {result.stderr}'
                }
                
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': 'Blender rendering timed out after 5 minutes'
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Error during Blender rendering: {str(e)}'
            }
    
    def find_blender_executable(self):
        """Find Blender executable on the system"""
        possible_paths = [
            '/usr/bin/blender',
            '/usr/local/bin/blender',
            '/opt/blender/blender',
            'C:\\Program Files\\Blender Foundation\\Blender 3.3\\blender.exe',
            'C:\\Program Files\\Blender Foundation\\Blender 3.4\\blender.exe',
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        # Try to find in PATH
        try:
            result = subprocess.run(['which', 'blender'], capture_output=True, text=True)
            if result.returncode == 0:
                return result.stdout.strip()
        except:
            pass
        
        return None
    
    def get_blender_version(self, blender_path):
        """Get Blender version"""
        try:
            result = subprocess.run(
                [blender_path, '--version'],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return result.stdout.split('\n')[0]  # First line usually contains version
        except:
            pass
        return 'Unknown'

def render_video_with_blender(scene_config, output_path):
    """
    Main function to render video using Blender
    
    Args:
        scene_config: dict with complete scene configuration
        output_path: str - where to save the rendered video
    
    Returns:
        dict with success status and metadata
    """
    try:
        renderer = BlenderRenderer()
        result = renderer.render_with_blender(scene_config, output_path)
        
        # Clean up temp directory
        import shutil
        shutil.rmtree(renderer.temp_dir, ignore_errors=True)
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Failed to render with Blender: {str(e)}'
        }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) != 3:
        print("Usage: python render_with_blender.py <input_json> <output_path>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        with open(input_file, 'r') as f:
            scene_config = json.load(f)
        
        result = render_video_with_blender(scene_config, output_path)
        
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
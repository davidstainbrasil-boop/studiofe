#!/usr/bin/env python3
"""
Generate slide image from PPTX content
Used by video rendering pipeline
"""

import json
import sys
import os
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

def generate_slide_image(slide_data, output_path):
    """
    Generate an image from slide content
    
    Args:
        slide_data: dict with 'content', 'title', and 'style' keys
        output_path: str - where to save the generated image
    
    Returns:
        dict with success status and metadata
    """
    try:
        # Default settings
        width = 1920
        height = 1080
        bg_color = (255, 255, 255)  # White
        text_color = (0, 0, 0)      # Black
        
        # Create image
        img = Image.new('RGB', (width, height), bg_color)
        draw = ImageDraw.Draw(img)
        
        # Try to load a font, fallback to default
        try:
            title_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 48)
            content_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 32)
        except:
            title_font = ImageFont.load_default()
            content_font = ImageFont.load_default()
        
        # Draw title if present
        if slide_data.get('title'):
            title = slide_data['title']
            title_bbox = draw.textbbox((0, 0), title, font=title_font)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = (width - title_width) // 2
            draw.text((title_x, 100), title, fill=text_color, font=title_font)
        
        # Draw content (word wrap)
        content = slide_data.get('content', '')
        y_offset = 250
        max_width = width - 200
        line_height = 50
        
        words = content.split(' ')
        current_line = ""
        
        for word in words:
            test_line = current_line + word + " " if current_line else word + " "
            bbox = draw.textbbox((0, 0), test_line, font=content_font)
            line_width = bbox[2] - bbox[0]
            
            if line_width <= max_width:
                current_line = test_line
            else:
                if current_line:
                    draw.text((100, y_offset), current_line.strip(), fill=text_color, font=content_font)
                    y_offset += line_height
                current_line = word + " "
        
        # Draw last line
        if current_line:
            draw.text((100, y_offset), current_line.strip(), fill=text_color, font=content_font)
        
        # Save image
        img.save(output_path, 'PNG', quality=95)
        
        return {
            'success': True,
            'output_path': output_path,
            'dimensions': {'width': width, 'height': height},
            'file_size': os.path.getsize(output_path)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) != 3:
        print("Usage: python generate_slide_image.py <input_json> <output_path>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_path = sys.argv[2]
    
    try:
        with open(input_file, 'r') as f:
            slide_data = json.load(f)
        
        result = generate_slide_image(slide_data, output_path)
        
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
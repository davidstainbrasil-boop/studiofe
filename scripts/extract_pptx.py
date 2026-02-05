#!/usr/bin/env python3
import sys
import json
import argparse
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET
from PIL import Image
import io
import base64

def extract_pptx_content(pptx_path, output_dir, format='json'):
    """
    Extrai conteúdo de um arquivo PPTX e converte para o formato especificado
    
    Args:
        pptx_path: Caminho do arquivo PPTX
        output_dir: Diretório de saída
        format: Formato de saída ('json', 'images', 'text')
    
    Returns:
        Dict com conteúdo extraído
    """
    
    # Criar diretórios de saída
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    images_dir = output_path / 'images'
    images_dir.mkdir(exist_ok=True)
    
    # Extrair conteúdo do PPTX (que é um ZIP)
    with zipfile.ZipFile(pptx_path, 'r') as zip_ref:
        zip_ref.extractall(output_path / 'extracted')
    
    # Carregar apresentação
    presentation_xml = output_path / 'extracted' / 'ppt' / 'presentation.xml'
    tree = ET.parse(presentation_xml)
    root = tree.getroot()
    
    # Namespaces do PPTX
    namespaces = {
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    }
    
    # Encontrar todos os slides
    slides = []
    slide_ids = root.findall('.//p:sldId', namespaces)
    
    for i, slide_id in enumerate(slide_ids):
        rel_id = slide_id.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
        slide_path = output_path / 'extracted' / 'ppt' / 'slides' / f'slide{i+1}.xml'
        
        if not slide_path.exists():
            continue
            
        # Processar slide
        slide_data = process_slide(slide_path, namespaces, images_dir, i+1)
        slides.append(slide_data)
    
    # Montar resultado
    result = {
        title: Path(pptx_path).stem,
        total_slides: len(slides),
        slides: slides
    }
    
    # Salvar em diferentes formatos
    if format == 'json':
        with open(output_path / 'content.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(json.dumps(result, ensure_ascii=False))
    
    return result

def process_slide(slide_path, namespaces, images_dir, slide_number):
    """Processa um slide individual"""
    
    tree = ET.parse(slide_path)
    root = tree.getroot()
    
    slide_data = {
        slide_number: slide_number,
        title: '',
        text: '',
        speaker_notes: '',
        elements: [],
        image_path: None
    }
    
    # Extrair texto dos shapes
    shapes = root.findall('.//p:sp', namespaces)
    all_text = []
    
    for shape in shapes:
        text_elements = shape.findall('.//a:t', namespaces)
        for text_elem in text_elements:
            if text_elem.text:
                all_text.append(text_elem.text.strip())
    
    slide_data['text'] = ' '.join(all_text)
    
    # Extrair título (geralmente o primeiro texto maior)
    if all_text:
        slide_data['title'] = all_text[0] if len(all_text[0]) > 10 else f'Slide {slide_number}'
    
    # Extrair speaker notes
    notes_slide = slide_path.parent / f'notesSlide{slide_number}.xml'
    if notes_slide.exists():
        try:
            notes_tree = ET.parse(notes_slide)
            notes_root = notes_tree.getroot()
            notes_text = notes_root.findall('.//a:t', namespaces)
            slide_data['speaker_notes'] = ' '.join([t.text for t in notes_text if t.text])
        except:
            pass
    
    # Extrair imagens
    images = root.findall('.//p:pic', namespaces)
    if images:
        # Gerar imagem de preview (simplificada)
        preview_path = images_dir / f'slide_{slide_number}_preview.png'
        generate_slide_preview(slide_data, preview_path)
        slide_data['image_path'] = str(preview_path)
    
    # Extrair elementos de mídia
    media_elements = []
    for img in images:
        media_elements.append({
            type: 'image',
            description: 'Imagem do slide'
        })
    
    slide_data['elements'] = media_elements
    
    return slide_data

def generate_slide_preview(slide_data, output_path):
    """Gera uma imagem de preview simples do slide"""
    
    # Criar imagem básica com texto
    width, height = 1920, 1080
    img = Image.new('RGB', (width, height), color='white')
    
    # Aqui poderíamos usar PIL para desenhar o texto
    # Por ora, salvamos uma imagem em branco
    img.save(output_path)

def main():
    parser = argparse.ArgumentParser(description='Extrair conteúdo de arquivos PPTX')
    parser.add_argument('--input', required=True, help='Arquivo PPTX de entrada')
    parser.add_argument('--output', required=True, help='Diretório de saída')
    parser.add_argument('--format', default='json', choices=['json', 'images', 'text'], 
                       help='Formato de saída')
    
    args = parser.parse_args()
    
    try:
        result = extract_pptx_content(args.input, args.output, args.format)
        print(f"Successfully processed {result['total_slides']} slides")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
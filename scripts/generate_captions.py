#!/usr/bin/env python3
import sys
import json
import argparse
from pathlib import Path
import whisper
import cv2
import numpy as np
from typing import List, Dict, Optional
import srt
import subprocess
import os

class CaptionGenerator:
    def __init__(self, model_size: str = "base"):
        """
        Inicializa o gerador de legendas
        
        Args:
            model_size: Tamanho do modelo Whisper (tiny, base, small, medium, large)
        """
        self.model_size = model_size
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Carrega o modelo Whisper"""
        try:
            print(f"Carregando modelo Whisper: {self.model_size}")
            self.model = whisper.load_model(self.model_size)
            print("Modelo carregado com sucesso!")
        except Exception as e:
            print(f"Erro ao carregar modelo Whisper: {e}")
            raise
    
    def extract_audio_from_video(self, video_path: str, output_path: str = None) -> str:
        """
        Extrai áudio de um arquivo de vídeo
        
        Args:
            video_path: Caminho do vídeo
            output_path: Caminho de saída do áudio (opcional)
        
        Returns:
            Caminho do arquivo de áudio extraído
        """
        if output_path is None:
            output_path = video_path.rsplit('.', 1)[0] + '_temp_audio.wav'
        
        try:
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-vn',  # No video
                '-acodec', 'pcm_s16le',  # Audio codec
                '-ar', '16000',  # Sample rate
                '-ac', '1',  # Mono
                '-y',  # Overwrite output
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            print(f"Áudio extraído: {output_path}")
            return output_path
            
        except subprocess.CalledProcessError as e:
            print(f"Erro ao extrair áudio: {e}")
            raise
    
    def transcribe_audio(self, audio_path: str, language: str = "pt") -> Dict:
        """
        Transcreve áudio usando Whisper
        
        Args:
            audio_path: Caminho do áudio
            language: Idioma (pt, en, es, etc.)
        
        Returns:
            Dicionário com transcrição e timestamps
        """
        try:
            print(f"Transcrevendo áudio: {audio_path}")
            
            options = {
                "language": language,
                "task": "transcribe",
                "fp16": False,  # Para compatibilidade
                "verbose": False
            }
            
            result = self.model.transcribe(audio_path, **options)
            
            print(f"Transcrição concluída: {len(result['segments'])} segmentos")
            return result
            
        except Exception as e:
            print(f"Erro na transcrição: {e}")
            raise
    
    def generate_srt_captions(self, transcription_result: Dict, output_path: str) -> str:
        """
        Gera arquivo SRT a partir da transcrição
        
        Args:
            transcription_result: Resultado da transcrição Whisper
            output_path: Caminho do arquivo SRT
        
        Returns:
            Caminho do arquivo SRT gerado
        """
        try:
            subtitles = []
            
            for i, segment in enumerate(transcription_result['segments']):
                start_time = self._seconds_to_timedelta(segment['start'])
                end_time = self._seconds_to_timedelta(segment['end'])
                
                subtitle = srt.Subtitle(
                    index=i + 1,
                    start=start_time,
                    end=end_time,
                    content=segment['text'].strip()
                )
                subtitles.append(subtitle)
            
            # Gerar conteúdo SRT
            srt_content = srt.compose(subtitles)
            
            # Salvar arquivo
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(srt_content)
            
            print(f"Legendas SRT geradas: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"Erro ao gerar SRT: {e}")
            raise
    
    def generate_vtt_captions(self, transcription_result: Dict, output_path: str) -> str:
        """
        Gera arquivo VTT a partir da transcrição
        
        Args:
            transcription_result: Resultado da transcrição Whisper
            output_path: Caminho do arquivo VTT
        
        Returns:
            Caminho do arquivo VTT gerado
        """
        try:
            vtt_content = "WEBVTT\n\n"
            
            for segment in transcription_result['segments']:
                start_time = self._seconds_to_webvtt_time(segment['start'])
                end_time = self._seconds_to_webvtt_time(segment['end'])
                
                vtt_content += f"{start_time} --> {end_time}\n"
                vtt_content += f"{segment['text'].strip()}\n\n"
            
            # Salvar arquivo
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(vtt_content)
            
            print(f"Legendas VTT geradas: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"Erro ao gerar VTT: {e}")
            raise
    
    def generate_json_captions(self, transcription_result: Dict, output_path: str) -> str:
        """
        Gera arquivo JSON com legendas
        
        Args:
            transcription_result: Resultado da transcrição Whisper
            output_path: Caminho do arquivo JSON
        
        Returns:
            Caminho do arquivo JSON gerado
        """
        try:
            captions_data = {
                "language": transcription_result.get('language', 'unknown'),
                "duration": transcription_result.get('duration', 0),
                "segments": []
            }
            
            for segment in transcription_result['segments']:
                captions_data['segments'].append({
                    "id": segment['id'],
                    "start": segment['start'],
                    "end": segment['end'],
                    "text": segment['text'].strip(),
                    "confidence": segment.get('avg_logprob', 0)
                })
            
            # Salvar arquivo
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(captions_data, f, ensure_ascii=False, indent=2)
            
            print(f"Legendas JSON geradas: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"Erro ao gerar JSON: {e}")
            raise
    
    def burn_captions_to_video(self, video_path: str, captions_path: str, output_path: str, 
                              style: Dict = None) -> str:
        """
        Insere legendas diretamente no vídeo usando FFmpeg
        
        Args:
            video_path: Caminho do vídeo original
            captions_path: Caminho das legendas (SRT)
            output_path: Caminho do vídeo com legendas
            style: Configurações de estilo das legendas
        
        Returns:
            Caminho do vídeo com legendas
        """
        try:
            # Estilo padrão para legendas
            default_style = {
                'fontsize': 24,
                'fontcolor': 'white',
                'fontname': 'Inter',
                'shadowcolor': 'black',
                'shadowx': 2,
                'shadowy': 2,
                'bordercolor': 'black',
                'borderwidth': 1,
                'box': 1,
                'boxcolor': 'black@0.5',
                'boxborderw': 5,
                'x': '(w-text_w)/2',
                'y': '(h-text_h)-20'
            }
            
            if style:
                default_style.update(style)
            
            # Construir filtro de legendas
            subtitle_filter = f"subtitles={captions_path}:force_style='"
            filter_parts = []
            
            for key, value in default_style.items():
                if key == 'x' or key == 'y':
                    filter_parts.append(f"{key}={value}")
                else:
                    filter_parts.append(f"{key}={value}")
            
            subtitle_filter += ",".join(filter_parts) + "'"
            
            # Comando FFmpeg
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-vf', subtitle_filter,
                '-c:a', 'copy',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-y',
                output_path
            ]
            
            print("Inserindo legendas no vídeo...")
            subprocess.run(cmd, check=True, capture_output=True)
            
            print(f"Vídeo com legendas gerado: {output_path}")
            return output_path
            
        except subprocess.CalledProcessError as e:
            print(f"Erro ao inserir legendas: {e}")
            raise
    
    def _seconds_to_timedelta(self, seconds: float):
        """Converte segundos para timedelta"""
        from datetime import timedelta
        return timedelta(seconds=seconds)
    
    def _seconds_to_webvtt_time(self, seconds: float) -> str:
        """Converte segundos para formato WebVTT"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"
    
    def process_video(self, video_path: str, output_dir: str = None, 
                     formats: List[str] = ['srt', 'vtt', 'json'],
                     language: str = "pt", burn_to_video: bool = False) -> Dict[str, str]:
        """
        Processa vídeo completo: extrai áudio, transcreve e gera legendas
        
        Args:
            video_path: Caminho do vídeo
            output_dir: Diretório de saída
            formats: Formatos de legendas desejados
            language: Idioma da transcrição
            burn_to_video: Se deve inserir legendas no vídeo
        
        Returns:
            Dicionário com caminhos dos arquivos gerados
        """
        if output_dir is None:
            output_dir = Path(video_path).parent
        else:
            output_dir = Path(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)
        
        video_name = Path(video_path).stem
        results = {}
        
        try:
            # 1. Extrair áudio
            audio_path = self.extract_audio_from_video(video_path)
            results['audio'] = audio_path
            
            # 2. Transcrever áudio
            transcription_result = self.transcribe_audio(audio_path, language)
            
            # 3. Gerar legendas nos formatos solicitados
            for format_type in formats:
                output_path = output_dir / f"{video_name}_captions.{format_type}"
                
                if format_type == 'srt':
                    self.generate_srt_captions(transcription_result, str(output_path))
                    results['srt'] = str(output_path)
                    
                elif format_type == 'vtt':
                    self.generate_vtt_captions(transcription_result, str(output_path))
                    results['vtt'] = str(output_path)
                    
                elif format_type == 'json':
                    self.generate_json_captions(transcription_result, str(output_path))
                    results['json'] = str(output_path)
            
            # 4. Inserir legendas no vídeo (se solicitado)
            if burn_to_video and 'srt' in results:
                video_with_captions = output_dir / f"{video_name}_with_captions.mp4"
                self.burn_captions_to_video(
                    video_path, 
                    results['srt'], 
                    str(video_with_captions)
                )
                results['video_with_captions'] = str(video_with_captions)
            
            # 5. Limpar arquivo de áudio temporário
            try:
                os.remove(audio_path)
            except:
                pass
            
            return results
            
        except Exception as e:
            print(f"Erro no processamento: {e}")
            raise

def main():
    parser = argparse.ArgumentParser(description='Gerador de legendas automático')
    parser.add_argument('--input', required=True, help='Arquivo de vídeo ou áudio')
    parser.add_argument('--output-dir', help='Diretório de saída')
    parser.add_argument('--formats', nargs='+', 
                       default=['srt', 'vtt', 'json'],
                       choices=['srt', 'vtt', 'json'],
                       help='Formatos de legendas')
    parser.add_argument('--language', default='pt', 
                       choices=['pt', 'en', 'es', 'fr', 'de', 'it'],
                       help='Idioma da transcrição')
    parser.add_argument('--model', default='base',
                       choices=['tiny', 'base', 'small', 'medium', 'large'],
                       help='Tamanho do modelo Whisper')
    parser.add_argument('--burn-to-video', action='store_true',
                       help='Inserir legendas diretamente no vídeo')
    parser.add_argument('--style', help='Arquivo JSON com estilo das legendas')
    
    args = parser.parse_args()
    
    # Carregar estilo personalizado se fornecido
    style = None
    if args.style:
        with open(args.style, 'r') as f:
            style = json.load(f)
    
    try:
        # Inicializar gerador
        caption_generator = CaptionGenerator(args.model)
        
        # Processar vídeo
        results = caption_generator.process_video(
            video_path=args.input,
            output_dir=args.output_dir,
            formats=args.formats,
            language=args.language,
            burn_to_video=args.burn_to_video
        )
        
        # Retornar resultado como JSON
        success_info = {
            "success": True,
            "input": args.input,
            "output_files": results,
            "language": args.language,
            "model": args.model
        }
        
        print(json.dumps(success_info, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_info = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_info, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
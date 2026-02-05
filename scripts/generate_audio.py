#!/usr/bin/env python3
import sys
import json
import argparse
from pathlib import Path
import requests
from elevenlabs import ElevenLabs
import os

def generate_audio(text, voice_type, output_path, api_key=None):
    """
    Gera áudio a partir de texto usando ElevenLabs ou similar
    
    Args:
        text: Texto para converter em áudio
        voice_type: Tipo de voz (professional, casual, friendly, etc.)
        output_path: Caminho de saída do áudio
        api_key: API key do serviço de TTS
    """
    
    if not api_key:
        # Modo de desenvolvimento - gerar áudio fake
        generate_dummy_audio(text, output_path)
        return
    
    try:
        # Mapeamento de vozes
        voice_mapping = {
            'professional': 'rachel',
            'casual': 'domi', 
            'friendly': 'bella',
            'authoritative': 'adam',
            'warm': 'sam'
        }
        
        voice_name = voice_mapping.get(voice_type, 'rachel')
        
        # Inicializar cliente ElevenLabs
        client = ElevenLabs(api_key=api_key)
        
        # Gerar áudio
        audio = client.generate(
            text=text,
            voice=voice_name,
            model="eleven_multilingual_v2"
        )
        
        # Salvar áudio
        with open(output_path, 'wb') as f:
            for chunk in audio:
                f.write(chunk)
                
        print(f"Áudio gerado com sucesso: {output_path}")
        
    except Exception as e:
        print(f"Erro ao gerar áudio com ElevenLabs: {str(e)}")
        # Fallback para áudio dummy
        generate_dummy_audio(text, output_path)

def generate_dummy_audio(text, output_path):
    """
    Gera um arquivo de áudio dummy para desenvolvimento
    
    Args:
        text: Texto original (para referência)
        output_path: Caminho de saída
    """
    
    # Criar um arquivo WAV silencioso simples
    import wave
    import struct
    
    # Parâmetros do áudio
    sample_rate = 44100
    duration = max(2.0, len(text) * 0.05)  # 2s mínimo + 0.05s por caractere
    frequency = 440  # Hz
    
    # Gerar samples
    num_samples = int(sample_rate * duration)
    samples = []
    
    for i in range(num_samples):
        # Tom suave para teste
        sample = int(32767 * 0.1 * sin(2 * pi * frequency * i / sample_rate))
        samples.append(sample)
    
    # Criar arquivo WAV
    with wave.open(output_path, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        for sample in samples:
            wav_file.writeframes(struct.pack('<h', sample))
    
    print(f"Áudio dummy gerado: {output_path} (duração: {duration:.1f}s)")

def estimate_duration(text):
    """Estima duração do áudio baseado no texto"""
    words_per_minute = 150  # Velocidade média de fala
    words = len(text.split())
    minutes = words / words_per_minute
    return max(2.0, minutes * 60)  # Mínimo 2 segundos

from math import sin, pi

def main():
    parser = argparse.ArgumentParser(description='Gerar áudio a partir de texto')
    parser.add_argument('--text', required=True, help='Texto para converter')
    parser.add_argument('--voice', default='professional', 
                       choices=['professional', 'casual', 'friendly', 'authoritative', 'warm'],
                       help='Tipo de voz')
    parser.add_argument('--output', required=True, help='Arquivo de saída MP3/WAV')
    parser.add_argument('--api-key', help='API key do ElevenLabs (opcional)')
    
    args = parser.parse_args()
    
    # Criar diretório de saída se não existir
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        generate_audio(
            text=args.text,
            voice_type=args.voice,
            output_path=str(output_path),
            api_key=args.api_key or os.getenv('ELEVENLABS_API_KEY')
        )
        
        # Retornar informações em JSON para integração
        duration = estimate_duration(args.text)
        info = {
            success: True,
            output_path: str(output_path),
            duration: duration,
            text_length: len(args.text),
            voice: args.voice
        }
        print(json.dumps(info))
        
    except Exception as e:
        error_info = {
            success: False,
            error: str(e)
        }
        print(json.dumps(error_info), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
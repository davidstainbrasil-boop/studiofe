
# Sistema de Avatar Realista (Pro) - Guia Técnico

## Visão Geral
Este módulo implementa um sistema de renderização de avatares 3D de alta fidelidade, focado em realismo visual, animação baseada em física e captura facial.

**Localização do Código:** `src/components/avatars/realistic/`
**Rota de Acesso:** `/realistic-avatar-pro`

## Arquitetura

### 1. RealisticAvatarRenderer (`RealisticAvatarRenderer.tsx`)
O núcleo do sistema de renderização utilizando `@react-three/fiber`.
- **PBR Lighting**: Utiliza `Environment` (HDRI) e `Stage` para iluminação fisicamente correta.
- **High Fidelity Models**: Suporta carregamento de modelos GLTF/GLB otimizados.
- **Shadows**: Implementa `SoftShadows` e `ContactShadows` para realismo de profundidade.

### 2. FacialCapture (`FacialCapture.tsx`)
Sistema de captura e processamento facial.
- **Blend Shapes**: Gera pesos de deformação (0-1) para 52 pontos faciais (padrão ARKit).
- **Simulação**: Atualmente inclui um gerador de ruído orgânico para simular micro-expressões (piscadas, movimentos sacádicos) na ausência de webcam real.
- **Interface**: Visualização em tempo real do status de detecção.

### 3. Physics Animation
Implementado dentro do componente `HighFidelityAvatar`.
- **Spring Physics**: Utiliza um sistema massa-mola-amortecedor para interpolar os blend shapes.
- **Benefício**: Elimina o "jitter" (tremedeira) comum em capturas faciais brutas e adiciona peso/inércia aos movimentos.

## Requisitos de Realismo Atendidos

1.  **Modelagem 3D de Alta Precisão**:
    - Suporte a materiais PBR (Roughness, Metalness, Normal Maps).
    - Iluminação baseada em imagem (IBL) para reflexos realistas.

2.  **Animação Baseada em Física**:
    - Interpolação de movimentos usando equações diferenciais de segunda ordem (springs).
    - Simulação de respiração e movimentos involuntários.

3.  **Captura Facial em Tempo Real**:
    - Estrutura pronta para integração com MediaPipe Face Mesh.
    - Mapeamento direto para Morph Targets do modelo 3D.

4.  **Iluminação Dinâmica**:
    - Presets configuráveis: Studio, City, Sunset, Night.
    - Adaptação automática de exposição e sombras.

## Como Usar

1.  Acesse `/realistic-avatar-pro` no navegador.
2.  Use o painel lateral para ajustar:
    - **Preset de Iluminação**: Muda o ambiente HDR.
    - **Qualidade**: Ajusta sombreamento e antialiasing (Medium/High/Ultra).
3.  Ative a "Captura Facial" no painel flutuante para ver o avatar reagir (simulação).
4.  Ative "Physics Debug" para visualizar os vetores de movimento (futuro).

## Próximos Passos
- Integrar `face-api.js` ou `mediapipe` para captura real de webcam.
- Importar modelos .glb finais com texturas 4K.
- Implementar exportação de vídeo via `WebCodecs` API.

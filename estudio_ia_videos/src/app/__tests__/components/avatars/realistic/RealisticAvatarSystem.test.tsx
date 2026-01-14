import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RealisticAvatarSystem from '@/components/avatars/realistic/RealisticAvatarSystem';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock R3F and Drei components
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>CanvasMock {children}</div>,
  useFrame: jest.fn(),
  useThree: () => ({ gl: { domElement: { toDataURL: jest.fn() }, render: jest.fn() }, scene: {}, camera: {} }),
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div>OrbitControlsMock</div>,
  PerspectiveCamera: () => <div>PerspectiveCameraMock</div>,
  Environment: () => <div>EnvironmentMock</div>,
  ContactShadows: () => <div>ContactShadowsMock</div>,
  useGLTF: () => ({ scene: {} }),
  Stage: ({ children }: { children: React.ReactNode }) => <div>StageMock {children}</div>,
  SoftShadows: () => <div>SoftShadowsMock</div>,
  BakeShadows: () => <div>BakeShadowsMock</div>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Maximize2: () => <div data-testid="icon-maximize" />,
  Settings2: () => <div data-testid="icon-settings" />,
  Zap: () => <div data-testid="icon-zap" />,
  Download: () => <div data-testid="icon-download" />,
  Palette: () => <div data-testid="icon-palette" />,
  User: () => <div data-testid="icon-user" />,
  Camera: () => <div data-testid="icon-camera" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  Power: () => <div data-testid="icon-power" />,
  PowerOff: () => <div data-testid="icon-power-off" />,
}));

describe('RealisticAvatarSystem', () => {
  it('renders the main layout', () => {
    render(<RealisticAvatarSystem />);
    expect(screen.getByText('Avatar Realista')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('FPS:')).toBeInTheDocument();
  });

  it('renders configuration tabs', () => {
    render(<RealisticAvatarSystem />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Ajustes')).toBeInTheDocument();
  });

  it('renders export buttons', () => {
    render(<RealisticAvatarSystem />);
    expect(screen.getByText('Exportar Imagem')).toBeInTheDocument();
    expect(screen.getByText('Exportar JSON')).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    render(<RealisticAvatarSystem />);
    
    // Default tab is 'customize' (Editar)
    expect(screen.getByText('Materiais')).toBeInTheDocument();
    
    // Click on Settings tab
    const ajustesTab = screen.getByText('Ajustes');
    fireEvent.click(ajustesTab);
    
    // Aguarda a tab ser renderizada e verifica o texto em maiúsculas
    await waitFor(() => {
      expect(screen.getByText(/qualidade de renderização/i)).toBeInTheDocument();
    });
  });
});

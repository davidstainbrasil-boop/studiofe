import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RealisticAvatarSystem from '@/components/avatars/realistic/RealisticAvatarSystem';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock child components to avoid issues with their dependencies or rendering
jest.mock('@/components/avatars/realistic/RealisticAvatarRenderer', () => {
  const React = require('react');
  return {
    RealisticAvatarRenderer: React.forwardRef(function RealisticAvatarRenderer(props: any, ref: any) {
      React.useImperativeHandle(ref, () => ({
        captureScreenshot: () => 'data:image/png;base64,fake'
      }));
      return React.createElement('div', { 'data-testid': 'realistic-avatar-renderer' }, 'RealisticAvatarRenderer Mock');
    })
  };
});

jest.mock('@/components/avatars/realistic/FacialCapture', () => {
  const React = require('react');
  return {
    FacialCapture: function FacialCapture() { return React.createElement('div', { 'data-testid': 'facial-capture' }, 'FacialCapture Mock') }
  };
});

jest.mock('@/components/studio-unified/VoiceSelector', () => {
  const React = require('react');
  return {
    VoiceSelector: function VoiceSelector() { return React.createElement('div', { 'data-testid': 'voice-selector' }, 'VoiceSelector Mock') }
  };
});

// Mock UI components
// ... (Removing the first duplicated Tabs mock block entirely as it was overridden by the second one anyway)

// Melhor mock para Tabs que funciona com aninhamento
jest.mock('@/components/ui/tabs', () => {
  const React = require('react');
  const TabsContext = React.createContext({ value: '', setValue: (v: string) => {} });

  return {
    Tabs: function Tabs({ children, defaultValue, className }: any) {
      const [value, setValue] = React.useState(defaultValue || 'customize');
      return (
        <TabsContext.Provider value={{ value, setValue }}>
          <div className={className} data-testid="tabs-root">{children}</div>
        </TabsContext.Provider>
      );
    },
    TabsList: function TabsList({ children, className }: any) { return <div className={className}>{children}</div> },
    TabsTrigger: function TabsTrigger({ value, children, onClick }: any) {
      const { setValue, value: currentValue } = React.useContext(TabsContext);
      return (
        <button 
          onClick={(e) => {
            setValue(value);
            if(onClick) onClick(e);
          }}
          data-state={currentValue === value ? 'active' : 'inactive'}
        >
          {children}
        </button>
      );
    },
    TabsContent: function TabsContent({ value, children }: any) {
       const { value: currentValue } = React.useContext(TabsContext);
       if (value !== currentValue) return null;
       return <div>{children}</div>;
     }
   };
 });

 jest.mock('@/components/ui/select', () => ({
  Select: function Select({ children }: any) { return <div>{children}</div> },
  SelectTrigger: function SelectTrigger({ children }: any) { return <button>{children}</button> },
  SelectValue: function SelectValue() { return <span>Select Value</span> },
  SelectContent: function SelectContent({ children }: any) { return <div>{children}</div> },
  SelectItem: function SelectItem({ children }: any) { return <div>{children}</div> },
 }));

 jest.mock('@/components/ui/slider', () => ({
  Slider: function Slider() { return <div data-testid="slider-mock" /> }
 }));

 jest.mock('@/components/ui/switch', () => ({
  Switch: function Switch() { return <div data-testid="switch-mock" /> }
 }));
 
 // Mock Lucide icons
jest.mock('lucide-react', () => ({
  Maximize2: function Maximize2() { return <div data-testid="icon-maximize" /> },
  Settings2: function Settings2() { return <div data-testid="icon-settings" /> },
  Zap: function Zap() { return <div data-testid="icon-zap" /> },
  Download: function Download() { return <div data-testid="icon-download" /> },
  Palette: function Palette() { return <div data-testid="icon-palette" /> },
  User: function User() { return <div data-testid="icon-user" /> },
  Mic: function Mic() { return <div data-testid="icon-mic" /> },
  Camera: function Camera() { return <div data-testid="icon-camera" /> },
  RefreshCw: function RefreshCw() { return <div data-testid="icon-refresh" /> },
  Power: function Power() { return <div data-testid="icon-power" /> },
  PowerOff: function PowerOff() { return <div data-testid="icon-power-off" /> },
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
    const user = userEvent.setup();
    render(<RealisticAvatarSystem />);
    
    // Default tab is 'customize' (Editar)
    expect(screen.getByText('Materiais')).toBeInTheDocument();
    
    // Click on Settings tab
    const ajustesTab = screen.getByText('Ajustes');
    await user.click(ajustesTab);
    
    // Aguarda a mudança de conteúdo
    await waitFor(() => {
      // Verifica se o conteúdo da aba 'Ajustes' aparece (Qualidade de Renderização é um título provável)
      expect(screen.getByText(/Qualidade de Renderização/i)).toBeInTheDocument();
      // Verifica se o conteúdo da aba anterior sumiu
      expect(screen.queryByText('Materiais')).not.toBeInTheDocument();
    });
  });
});

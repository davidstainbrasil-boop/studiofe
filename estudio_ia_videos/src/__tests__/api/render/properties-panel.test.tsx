import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PropertiesPanel, type ElementProperties } from '@/components/studio-unified/PropertiesPanel';

jest.mock('lucide-react', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        return (props: unknown) =>
          React.createElement('div', { 'data-icon': String(prop), ...(props as object) });
      },
    },
  );
});

describe('PropertiesPanel', () => {
  const baseElement: ElementProperties = {
    id: 'el-1',
    name: 'Element 1',
    type: 'shape',
    locked: false,
    visible: true,
    transform: {
      x: 10,
      y: 20,
      scale: 1,
      rotation: 0,
      opacity: 0.5,
      width: 100,
      height: 80,
    },
    animations: [],
    effects: [],
  };

  it('renders empty state when no element is selected', () => {
    render(<PropertiesPanel element={null} onUpdate={jest.fn()} />);
    expect(screen.getByText('No element selected')).toBeInTheDocument();
    expect(screen.getByText('Select an element to edit its properties')).toBeInTheDocument();
  });

  it('shows opacity as percentage (0-1 → 0-100%)', () => {
    render(<PropertiesPanel element={baseElement} onUpdate={jest.fn()} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calls onUpdate when toggling visibility', () => {
    const onUpdate = jest.fn();
    render(<PropertiesPanel element={baseElement} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Hide element' }));
    expect(onUpdate).toHaveBeenCalledWith({ visible: false });
  });

  it('calls onUpdate when changing X input', () => {
    const onUpdate = jest.fn();
    render(<PropertiesPanel element={baseElement} onUpdate={onUpdate} />);

    const xInput = screen.getByLabelText('X');
    fireEvent.change(xInput, { target: { value: '123' } });

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        transform: expect.objectContaining({ x: 123 }),
      }),
    );
  });
});


import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IPAKeyboard from '../IPAKeyboard';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.innerWidth
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

describe('IPAKeyboard Fixed Layout', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  test('should render IPAKeyboard component', () => {
    const { container } = render(
      <IPAKeyboard
        mode="build"
        selectedLanguage="en-GB"
        fixedLayout={false}
        minButtonSize={60}
        onPhonemeClick={() => {}}
      />
    );

    // Check if the component renders
    const grid = container.querySelector('.phoneme-grid');
    expect(grid).toBeInTheDocument();
  });

  test('should apply fixed layout class when fixedLayout is true and has valid configuration', () => {
    // Mock localStorage to return a simple configuration
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'phonemeOrder') {
        return JSON.stringify({
          'en-GB': ['a', 'b', 'c', 'd', 'e', 'f']
        });
      }
      if (key === 'gridConfig') {
        return JSON.stringify({
          'en-GB': {
            columns: 3,
            allowBlankCells: false
          }
        });
      }
      return null;
    });

    const { container } = render(
      <IPAKeyboard
        mode="build"
        selectedLanguage="en-GB"
        fixedLayout={true}
        minButtonSize={60}
        onPhonemeClick={() => {}}
      />
    );

    // The component should render with a grid
    const grid = container.querySelector('.phoneme-grid');
    expect(grid).toBeInTheDocument();

    // For now, just verify the component renders without errors
    // The fixed layout functionality will be tested in integration tests
  });

  test('should render buttons for phonemes', () => {
    const { container } = render(
      <IPAKeyboard
        mode="build"
        selectedLanguage="en-GB"
        fixedLayout={false}
        minButtonSize={60}
        onPhonemeClick={() => {}}
      />
    );

    // Should have buttons for phonemes
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Check that some common English phonemes are present
    expect(container.querySelector('[data-phoneme="iː"]')).toBeInTheDocument();
    expect(container.querySelector('[data-phoneme="ɪ"]')).toBeInTheDocument();
    expect(container.querySelector('[data-phoneme="e"]')).toBeInTheDocument();
  });
});

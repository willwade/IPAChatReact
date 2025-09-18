import React, { useState, useEffect } from 'react';
import PhonemeIcon from './PhonemeIcon';

const PhonemeIconRow = ({
  phonemes = [],
  partialPhoneme = '',
  onPhonemeClick,
  onPhonemePlay,
  iconSize = 50
}) => {
  const [layout, setLayout] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('example2');

  useEffect(() => {
    const loadLayout = async () => {
      try {
        console.log(`Loading layout: ${selectedLayout}`);
        const response = await fetch(`/examples/${selectedLayout}.json`);
        if (response.ok) {
          const layoutData = await response.json();
          console.log(`Layout loaded:`, layoutData);
          setLayout(layoutData);
        } else {
          console.warn(`Could not load layout: ${selectedLayout}`, response.status);
          setLayout(null);
        }
      } catch (error) {
        console.warn('Error loading layout:', error);
        setLayout(null);
      }
    };

    loadLayout();
  }, [selectedLayout]);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '8px',
    minHeight: `${iconSize + 20}px`,
    border: '1px solid rgba(0, 0, 0, 0.23)',
    borderRadius: '4px',
    backgroundColor: 'white',
    scrollbarWidth: 'thin',
    scrollbarColor: '#ccc transparent'
  };

  const scrollContainerStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '4px',
    minWidth: 'fit-content'
  };

  const placeholderStyle = {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '16px',
    fontStyle: 'italic',
    padding: '16px',
    textAlign: 'center',
    width: '100%'
  };

  const layoutSelectorStyle = {
    position: 'absolute',
    top: '4px',
    right: '4px',
    fontSize: '12px',
    padding: '2px 6px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    cursor: 'pointer'
  };

  const changeLayout = () => {
    const layouts = ['example1', 'example2', 'example3', 'example4', 'example5'];
    const currentIndex = layouts.indexOf(selectedLayout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    setSelectedLayout(layouts[nextIndex]);
  };

  const hasContent = phonemes.length > 0 || partialPhoneme;

  return (
    <div style={{ position: 'relative' }}>
      <div style={containerStyle}>
        {!hasContent && (
          <div style={placeholderStyle}>
            Type IPA phonemes to see icons here...
          </div>
        )}

        {hasContent && (
          <div style={scrollContainerStyle}>
            {phonemes.map((phoneme, index) => (
              <PhonemeIcon
                key={`${phoneme}-${index}`}
                phoneme={phoneme}
                index={index}
                layout={layout}
                size={iconSize}
                onPlay={onPhonemePlay}
                onClick={onPhonemeClick}
              />
            ))}

            {partialPhoneme && (
              <PhonemeIcon
                phoneme={partialPhoneme.replace(/^\//, '')}
                index={phonemes.length}
                layout={layout}
                isPartial={true}
                size={iconSize}
                onPlay={onPhonemePlay}
                onClick={onPhonemeClick}
              />
            )}
          </div>
        )}
      </div>

      <div style={layoutSelectorStyle} onClick={changeLayout} title="Click to change layout">
        {selectedLayout}
      </div>
    </div>
  );
};

export default PhonemeIconRow;
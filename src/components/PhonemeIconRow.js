import React, { useState, useEffect, useRef } from 'react';
import PhonemeIcon from './PhonemeIcon';

const PhonemeIconRow = ({
  phonemes = [],
  partialPhoneme = '',
  onPhonemeClick,
  onPhonemePlay,
  iconSize = 50,
  style = {},
  windowWidth = 800
}) => {
  const [layout, setLayout] = useState(null);
  const [selectedLayout, setSelectedLayout] = useState('example2');
  const containerRef = useRef(null);

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

  // Auto-scroll to the right when phonemes are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [phonemes.length, partialPhoneme]);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '2px',
    height: '95%', // Use 95% of available height instead of fixed icon size
    border: '1px solid rgba(0, 0, 0, 0.23)',
    borderRadius: '4px',
    backgroundColor: '#fff8ff',
    scrollbarWidth: 'thin',
    scrollbarColor: '#ccc transparent',
    boxSizing: 'border-box'
  };

  const scrollContainerStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: windowWidth < 600 ? '2px' : '4px', // Smaller gap on small viewports
    minWidth: 'fit-content'
  };

  const placeholderStyle = {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '16px',
    fontStyle: 'italic',
    padding: '8px',
    textAlign: 'center',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    boxSizing: 'border-box'
  };


  const hasContent = phonemes.length > 0 || partialPhoneme;

  return (
    <div style={{ position: 'relative', ...style }}>
      <div ref={containerRef} style={containerStyle}>
        {!hasContent && (
          <div style={placeholderStyle}>
            Type sounds...
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

    </div>
  );
};

export default PhonemeIconRow;
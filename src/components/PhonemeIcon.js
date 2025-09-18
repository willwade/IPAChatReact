import React from 'react';

const PhonemeIcon = ({
  phoneme,
  index,
  layout,
  isPartial = false,
  size = 50,
  onPlay,
  onClick
}) => {
  const customization = layout?.ipaCustomizations?.[phoneme] || {};
  const {
    image,
    customColor,
    hideLabel = false
  } = customization;

  // Debug logging - includes size for cache busting
  console.log(`PhonemeIcon: phoneme="${phoneme}", size=${size}, hasLayout=${!!layout}, hasCustomization=${!!Object.keys(customization).length}, hasImage=${!!image}, hideLabel=${hideLabel}`);
  console.log(`Image dimensions: ${size * 0.98}px x ${size * 1.1}px`);

  const handleClick = () => {
    if (onClick) onClick(phoneme, index);
    if (onPlay) onPlay(phoneme);
  };

  const containerStyle = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size * 1.4}px`,
    margin: '1px',
    padding: '1px',
    borderRadius: '1px',
    border: isPartial ? '2px dashed #ff9800' : '1px solid #ccc',
    backgroundColor: isPartial ? 'rgba(255, 193, 7, 0.1)' : 'white',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease'
  };

  const imageStyle = {
    width: `${size * 0.98}px`,
    height: `${size * 1.1}px`,
    objectFit: 'contain',
    borderRadius: '2px',
    maxWidth: '100%',
    maxHeight: '80%'
  };

  const textStyle = {
    fontSize: hideLabel ? `${size * 0.6}px` : `${size * 0.4}px`,
    fontFamily: 'monospace',
    color: customColor || (isPartial ? '#ff9800' : '#333'),
    fontWeight: isPartial ? 'bold' : 'normal',
    fontStyle: isPartial ? 'italic' : 'normal',
    textAlign: 'center',
    lineHeight: 0.9,
    maxWidth: '100%',
    overflow: 'hidden',
    margin: '0'
  };

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {image && (
        <img
          key={`img-${phoneme}-${size}`}
          src={image}
          alt={phoneme}
          style={imageStyle}
        />
      )}

      {/* Always show text unless specifically hidden and image exists */}
      {(!hideLabel || !image) && (
        <span style={textStyle}>
          {phoneme}
        </span>
      )}
    </div>
  );
};

export default PhonemeIcon;
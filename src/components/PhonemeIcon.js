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

  // Debug logging
  console.log(`PhonemeIcon: phoneme="${phoneme}", hasLayout=${!!layout}, hasCustomization=${!!Object.keys(customization).length}, hasImage=${!!image}, hideLabel=${hideLabel}`);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) onClick(phoneme, index);
    if (onPlay) onPlay(phoneme);
  };

  const containerStyle = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size * 0.95}px`,
    height: `${size * 1.2}px`,
    margin: '1px',
    padding: '1px',
    borderRadius: '4px',
    border: isPartial ? '2px dashed #ff9800' : '1px solid #ccc',
    backgroundColor: isPartial ? 'rgba(255, 193, 7, 0.1)' : '#f8f9fa',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease'
  };

  const imageStyle = {
    width: `${size * 0.9}px`,
    height: `${size * 0.95}px`,
    objectFit: 'contain',
    borderRadius: '6px'
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
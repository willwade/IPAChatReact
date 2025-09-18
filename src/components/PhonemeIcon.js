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
    height: `${size}px`,
    margin: '2px',
    padding: '4px',
    borderRadius: '6px',
    border: isPartial ? '2px dashed #ff9800' : '1px solid #ccc',
    backgroundColor: isPartial ? 'rgba(255, 193, 7, 0.1)' : 'white',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease'
  };

  const imageStyle = {
    width: `${size * 0.7}px`,
    height: `${size * 0.7}px`,
    objectFit: 'contain',
    borderRadius: '4px'
  };

  const textStyle = {
    fontSize: hideLabel ? `${size * 0.5}px` : `${size * 0.3}px`,
    fontFamily: 'monospace',
    color: customColor || (isPartial ? '#ff9800' : '#333'),
    fontWeight: isPartial ? 'bold' : 'normal',
    fontStyle: isPartial ? 'italic' : 'normal',
    textAlign: 'center',
    lineHeight: 1,
    maxWidth: '100%',
    overflow: 'hidden'
  };

  return (
    <div
      style={containerStyle}
      onClick={handleClick}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {image && !hideLabel && (
        <img
          src={image}
          alt={phoneme}
          style={imageStyle}
        />
      )}
      {!hideLabel && (
        <span style={textStyle}>
          {phoneme}
        </span>
      )}
      {hideLabel && !image && (
        <span style={{...textStyle, fontSize: `${size * 0.5}px`}}>
          {phoneme}
        </span>
      )}
    </div>
  );
};

export default PhonemeIcon;
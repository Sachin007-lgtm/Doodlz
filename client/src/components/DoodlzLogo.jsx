import React from 'react'

export default function DoodlzLogo({ style, width = 160 }) {
  const height = width * 0.55
  const fontSize = width * 0.185

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: width,
      height: height,
      userSelect: 'none',
      flexShrink: 0,
      ...style
    }}>
      {/* 1. Background Doodle Shapes (SVG) */}
      <svg
        viewBox="0 0 200 110"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible'
        }}
      >
        {/* Cyan cloud fingers shape (top left behind D and O) */}
        <path
          d="M 22,45 
             C 16,30 24,18 38,24 
             C 40,10 55,8 65,22 
             C 72,12 85,15 82,32 
             C 86,40 80,48 70,46 
             C 60,50 48,50 35,46 
             C 28,48 20,42 22,45 Z"
          fill="#a5f3fc"
          opacity="0.8"
        />

        {/* Yellow clover shape (top right above L) */}
        <path
          d="M 128,34 
             C 123,28 126,20 133,24 
             C 136,18 144,18 147,24 
             C 154,20 157,28 152,34 
             C 156,40 148,44 143,40 
             C 138,44 130,40 128,34 Z"
          fill="#fef08a"
          opacity="0.85"
        />

        {/* Small blue star sparkle (far right of yellow clover) */}
        <path
          d="M 166,30 
             Q 169,30 169,27 
             Q 169,30 172,30 
             Q 169,30 169,33 
             Q 169,30 166,30 Z"
          fill="#bfdbfe"
          opacity="0.9"
        />

        {/* Squiggly orange scribbles (below O and D) */}
        <path
          d="M 64,68 
             L 68,86 
             L 75,70 
             L 80,87 
             L 87,71 
             L 91,86 
             L 96,70"
          stroke="#fed7aa"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
        />

        {/* Fluffy purple cloud shape (bottom right below L and Z) */}
        <path
          d="M 132,70 
             C 124,62 116,68 120,78 
             C 112,84 118,95 128,92 
             C 132,98 144,98 146,90 
             C 154,92 156,82 148,76 
             C 150,66 140,62 132,70 Z"
          fill="#f3e8ff"
          opacity="0.85"
        />
      </svg>

      {/* 2. Foreground DOODLZ Text */}
      <span style={{
        position: 'relative',
        zIndex: 2,
        fontFamily: "'Fredoka', sans-serif",
        fontWeight: 800,
        fontSize: fontSize,
        color: '#5c86f0',
        lineHeight: 1,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        transform: 'rotate(-1.5deg) translateY(-2px)'
      }}>
        DOODLZ
      </span>
    </div>
  )
}

"use client"

import Spline from '@splinetool/react-spline'
import React, { useEffect, useState } from 'react'

export type Position = 'left' | 'center' | 'right';

interface SplineBgProps {
  position: Position;
}

const SplineBg: React.FC<SplineBgProps> = ({ position }) => {
  const [translateX, setTranslateX] = useState(0);

  useEffect(() => {
    // Get window width and calculate positions
    const windowWidth = window.innerWidth;
    const splineWidth = 600; // width of our Spline container
    
    const positions = {
      left: -(windowWidth / 2 ),
      center: -(splineWidth / 3 ),
      right: (windowWidth / 2 - splineWidth)
    };

    setTranslateX(positions[position]);
  }, [position]);

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: '600px',
        height: '100%',
        zIndex: 0,
        transform: `translateX(${translateX}px)`,
        transition: 'transform 1000ms ease-in-out'
      }}
    >
      <Spline
        scene="https://prod.spline.design/TbHDOoARsB9TBy67/scene.splinecode"
      />
    </div>
  )
}

export default SplineBg
import React, { useState, useRef, useEffect } from 'react';

export default function MeasurementTool({ isActive }) {
  const [lines, setLines] = useState([]);
  const [currentLine, setCurrentLine] = useState(null);
  const containerRef = useRef(null);

  const getCoordinates = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleStart = (e) => {
    if (!isActive) return;
    if (e.type.startsWith('touch')) document.body.style.overflow = 'hidden'; // prevent scroll
    const coords = getCoordinates(e);
    setCurrentLine({ start: coords, end: coords });
  };

  const handleMove = (e) => {
    if (!isActive || !currentLine) return;
    const coords = getCoordinates(e);
    setCurrentLine(prev => ({ ...prev, end: coords }));
  };

  const handleEnd = () => {
    document.body.style.overflow = ''; // restore scroll
    if (!isActive || !currentLine) return;
    if (
      Math.abs(currentLine.start.x - currentLine.end.x) > 5 ||
      Math.abs(currentLine.start.y - currentLine.end.y) > 5
    ) {
      setLines(prev => [...prev, currentLine]);
    }
    setCurrentLine(null);
  };

  useEffect(() => {
    if (!isActive) {
      setLines([]);
      setCurrentLine(null);
    }
  }, [isActive]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: isActive ? 50 : 0,
        pointerEvents: isActive ? 'auto' : 'none',
        cursor: isActive ? 'crosshair' : 'default'
      }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      <svg style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
        {[...lines, currentLine].filter(Boolean).map((line, i) => {
          const dx = line.end.x - line.start.x;
          const dy = line.end.y - line.start.y;
          // Simple pixel distance
          const distance = Math.sqrt(dx * dx + dy * dy).toFixed(1);
          const midX = (line.start.x + line.end.x) / 2;
          const midY = (line.start.y + line.end.y) / 2;

          return (
            <g key={i}>
              <line 
                x1={line.start.x} y1={line.start.y} 
                x2={line.end.x} y2={line.end.y} 
                stroke="#FF3366" strokeWidth="2" 
                strokeDasharray="4 4"
              />
              <circle cx={line.start.x} cy={line.start.y} r="4" fill="#FF3366" />
              <circle cx={line.end.x} cy={line.end.y} r="4" fill="#FF3366" />
              <rect 
                x={midX - 30} y={midY - 12} 
                width="60" height="24" 
                fill="rgba(0,0,0,0.7)" rx="6"
              />
              <text 
                x={midX} y={midY + 4} 
                fill="white" fontSize="11" 
                fontWeight="900" textAnchor="middle"
              >
                {distance} px
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';

const GlowCursor = () => {
  const cursorRef = useRef(null);
  const ringRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;

      if (cursorRef.current) {
        cursorRef.current.style.left = clientX + 'px';
        cursorRef.current.style.top = clientY + 'px';
      }

      if (ringRef.current) {
        ringRef.current.style.left = clientX + 'px';
        ringRef.current.style.top = clientY + 'px';
      }

      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      {/* Glow Cursor */}
      <div
        ref={cursorRef}
        className={`fixed w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full pointer-events-none z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          filter: 'drop-shadow(0 0 8px #0ea5e9)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className={`fixed w-8 h-8 border-2 border-cyan-400 rounded-full pointer-events-none z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-60' : 'opacity-0'
        }`}
        style={{
          transform: 'translate(-50%, -50%)',
          filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.5))',
        }}
      />
    </>
  );
};

export default GlowCursor;

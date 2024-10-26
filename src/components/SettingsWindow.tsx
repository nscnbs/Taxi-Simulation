import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SettingsWindow.css';

interface SettingsWindowProps {
  show: boolean;
  onClose: () => void;
  onSpeedChange: (speed: number) => void;
}

const SettingsWindow: React.FC<SettingsWindowProps> = ({ show, onClose, onSpeedChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ top: 20, left: 20 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setOffset({ x: e.clientX - position.left, y: e.clientY - position.top });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        top: e.clientY - offset.y,
        left: e.clientX - offset.x,
      });
    }
  }, [isDragging, offset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);

  if (!show) return null;

  return (
    <div
      className="settings-window"
      ref={windowRef}
      style={{ top: position.top, left: position.left }}
      onMouseDown={handleMouseDown}
    >
      <h2>Speed</h2>
      <button onClick={() => onSpeedChange(100)}>x1</button>
      <button onClick={() => onSpeedChange(50)}>x2</button>
      <button onClick={() => onSpeedChange(20)}>x5</button>
      <button onClick={() => onSpeedChange(10)}>x10</button>
      <button onClick={() => onSpeedChange(5)}>x20</button>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default SettingsWindow;

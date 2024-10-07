import React, { useState, useEffect, useCallback } from 'react';
import TaxiList from './TaxiList';
import ClientList from './ClientList';
import './ListWindow.css';

interface ListWindowProps {
  show: boolean;
  onClose: () => void;
  taxis: any[];
  clients: any[];
}

const ListWindow: React.FC<ListWindowProps> = ({ show, onClose, taxis, clients }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ top: 20, left: 1100 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setOffset({ x: e.clientX - position.left, y: e.clientY - position.top });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({ top: e.clientY - offset.y, left: e.clientX - offset.x });
    }
  }, [isDragging, offset]); // Dodaj offset jako zależność

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Dodaj nasłuchiwacze zdarzeń, aby obsłużyć przeciąganie
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]); // Użyj handleMouseMove jako zależności

  if (!show) return null;

  return (
    <div
      className="list-window"
      style={{ top: position.top, left: position.left }}
      onMouseDown={handleMouseDown}
    >
      <h2>Taxi List</h2>
      <TaxiList taxis={taxis} />
      <h2>Client List</h2>
      <ClientList clients={clients} />
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default ListWindow;

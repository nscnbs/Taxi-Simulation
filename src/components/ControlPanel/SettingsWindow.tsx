import React, { useState, useEffect, useCallback, useRef } from "react";
import "./SettingsWindow.css";

interface SettingsWindowProps {
  show: boolean;
  onClose: () => void;
  onSpeedChange: (speed: number) => void;
  trafficModel: string;
  onTrafficChange: (value: string) => void;
  distanceMetric: string;
  onDistanceMetricChange: (value: string) => void;
}

const SettingsWindow: React.FC<SettingsWindowProps> = ({
  show,
  onClose,
  onSpeedChange,
  trafficModel,
  onTrafficChange,
  distanceMetric,
  onDistanceMetricChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ top: 20, left: 20 });
  const [activeSpeed, setActiveSpeed] = useState<number | null>(null);
  const [activeTrafficModel, setActiveTrafficModel] = useState<string | null>(
    null
  );
  const [activeDistanceMetric, setActiveDistanceMetric] = useState<
    string | null
  >(null);

  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setOffset({ x: e.clientX - position.left, y: e.clientY - position.top });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          top: e.clientY - offset.y,
          left: e.clientX - offset.x,
        });
      }
    },
    [isDragging, offset]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
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
      {[10, 20, 50, 100, 200].map((speed) => (
        <button
          key={speed}
          className={activeSpeed === speed ? "active" : ""}
          onClick={() => {
            onSpeedChange(speed);
            setActiveSpeed(speed);
          }}
        >
          x{speed / 10}
        </button>
      ))}
      <h2>Traffic Model</h2>
      {["optimistic", "pessimistic"].map((model) => (
        <button
          key={model}
          className={activeTrafficModel === model ? "active" : ""}
          onClick={() => {
            onTrafficChange(model);
            setActiveTrafficModel(model);
          }}
        >
          {model.charAt(0).toUpperCase() + model.slice(1)}
        </button>
      ))}
      <h2>Distance Metric</h2>
      {["duration", "distance"].map((metric) => (
        <button
          key={metric}
          className={activeDistanceMetric === metric ? "active" : ""}
          onClick={() => {
            onDistanceMetricChange(metric);
            setActiveDistanceMetric(metric);
          }}
        >
          {metric.charAt(0).toUpperCase() + metric.slice(1)}
        </button>
      ))}
      <h2></h2>
      <button className="close-button" onClick={onClose}>
        Close
      </button>
    </div>
  );
};

export default SettingsWindow;

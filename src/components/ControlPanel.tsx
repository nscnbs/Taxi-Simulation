import React from 'react';
import './ControlPanel.css';
import TaxiIcon from '../assets/icons/taxi.png';
import ClientIcon from '../assets/icons/client.png';
import StartIcon from '../assets/icons/start.png';
import PauseIcon from '../assets/icons/pause.png';
import StopIcon from '../assets/icons/stop.png';
import RestartIcon from '../assets/icons/restart.png';
import ListIcon from '../assets/icons/list.png';
import SettingsIcon from '../assets/icons/settings.png';

interface ControlPanelProps {
  onAddTaxi: () => void;
  onAddClient: () => void;
  onStartSimulation: () => void;
  onPauseSimulation: () => void;
  onRestartSimulation: () => void;
  onToggleList: () => void;
  onSettings: () => void;
  isSimulationActive: boolean;
}

function ControlPanel({
  onAddTaxi,
  onAddClient,
  onStartSimulation,
  onPauseSimulation,
  onRestartSimulation,
  onToggleList,
  onSettings,
  isSimulationActive,
}: ControlPanelProps) {
  return (
    <div className="control-panel">
         <button onClick={isSimulationActive ? onPauseSimulation : onStartSimulation}>
        <img src={isSimulationActive ? StopIcon : StartIcon} alt={isSimulationActive ? "Pause Simulation" : "Start Simulation"} />
      </button>
      <button onClick={onAddTaxi}>
        <img src={TaxiIcon} alt="Add Taxi" />
      </button>
      <button onClick={onAddClient}>
        <img src={ClientIcon} alt="Add Client" />
      </button>
      <button onClick={onRestartSimulation}>
        <img src={RestartIcon} alt="Restart Simulation" />
      </button>
      <button onClick={onToggleList}>
        <img src={ListIcon} alt="Toggle List" />
      </button>
      <button onClick={onSettings}>
        <img src={SettingsIcon} alt="Settings" />
      </button>
    </div>
  );
}

export default ControlPanel;

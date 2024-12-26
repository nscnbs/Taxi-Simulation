import React from 'react';
import './ControlPanel.css'; // Zaktualizowany plik CSS dla paska
import TaxiIcon from '../assets/icons/taxi.png';
import ClientIcon from '../assets/icons/client.png';
import StartIcon from '../assets/icons/start.png';
import PauseIcon from '../assets/icons/pause.png'; // Ikona pauzy
import StopIcon from '../assets/icons/stop.png';
import RestartIcon from '../assets/icons/restart.png'; // Ikona restartu
import ListIcon from '../assets/icons/list.png'; // Ikona restartu
import SettingsIcon from '../assets/icons/settings.png'; // Ikona ustawień

interface ControlPanelProps {
  onAddTaxi: () => void;
  onAddClient: () => void;
  onStartSimulation: () => void;
  onPauseSimulation: () => void; // Dodano obsługę pauzy
  onRestartSimulation: () => void; // Dodano obsługę restartu
  onToggleList: () => void; // Dodano obsługę restartu
  onSettings: () => void; // Dodano obsługę ustawień
  isSimulationActive: boolean; // Dodano status symulacji
}

function ControlPanel({
  onAddTaxi,
  onAddClient,
  onStartSimulation,
  onPauseSimulation,
  onRestartSimulation,
  onToggleList,
  onSettings,
  isSimulationActive, // Odbierz status symulacji
}: ControlPanelProps) {
  return (
    <div className="control-panel">
         <button onClick={isSimulationActive ? onPauseSimulation : onStartSimulation}>
        <img src={isSimulationActive ? PauseIcon : StartIcon} alt={isSimulationActive ? "Pause Simulation" : "Start Simulation"} />
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

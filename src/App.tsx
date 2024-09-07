import React, { useState, useEffect } from 'react';
import TaxiList from './components/TaxiList';
import ClientList from './components/ClientList';
import ControlPanel from './components/ControlPanel';
import Map from './components/Map';
import './App.css';
import { Taxi, Client } from './types';

function App() {
  const [taxis, setTaxis] = useState<Taxi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mapCenter = { lat: 52.2297, lng: 21.0122 }; // Domyślne centrum mapy (Warszawa)

  useEffect(() => {
    fetch("/api/taxis")
      .then(response => response.json())
      .then(data => setTaxis(data))
      .catch(error => console.error("Error fetching taxis:", error));

    fetch("/api/clients")
      .then(response => response.json())
      .then(data => setClients(data))
      .catch(error => console.error("Error fetching clients:", error));
  }, []);

  const handleAddTaxi = () => {
    // Obsługa dodawania taksówki
  };

  const handleAddClient = () => {
    // Obsługa dodawania klienta
  };

  const handleStartSimulation = () => {
    fetch("/api/simulation/start")
      .then(response => response.json())
      .then(data => setTaxis(data))
      .catch(error => console.error("Error starting simulation:", error));
  };

  const handleStopSimulation = () => {
    fetch("/api/simulation/stop")
      .then(response => response.json())
      .then(data => setTaxis(data))
      .catch(error => console.error("Error stopping simulation:", error));
  };

  const handleRestartSimulation = () => {
    fetch("/api/simulation/restart")
      .then(response => response.json())
      .then(data => setTaxis([]))
      .catch(error => console.error("Error restarting simulation:", error));
  };

  const handleSettings = () => {
    fetch("/api/settings")
      .then(response => response.json())
      .then(data => console.log("Settings:", data))
      .catch(error => console.error("Error fetching settings:", error));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`App ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Map center={mapCenter} zoom={12} />
      <TaxiList taxis={taxis} />
      <ClientList clients={clients} />
      <div className={`control-panel ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <ControlPanel
          onStartSimulation={handleStartSimulation}
          onAddTaxi={handleAddTaxi}
          onAddClient={handleAddClient}
          onStopSimulation={handleStopSimulation}
          onRestartSimulation={handleRestartSimulation}
          onSettings={handleSettings}
        />
      </div>
      <button className="toggle-button" onClick={toggleSidebar}>
        {sidebarOpen ? '⮜' : '⮞'}
      </button>
    </div>
  );
}

export default App;

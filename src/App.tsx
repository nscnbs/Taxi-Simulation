import React, { useState, useEffect } from 'react';
import TaxiList from './components/TaxiList';
import ClientList from './components/ClientList';
import ControlPanel from './components/ControlPanel';
import './App.css';
import { Taxi, Client } from './types'; // Import typów

function App() {
  const [taxis, setTaxis] = useState<Taxi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Nowa zmienna stanu

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
    // Obsługa zatrzymania symulacji
  };

  const handleRestartSimulation = () => {
    fetch("/api/simulation/restart")
      .then(response => response.json())
      .then(data => setTaxis([])) // Zakładamy, że resetujemy taksówki
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

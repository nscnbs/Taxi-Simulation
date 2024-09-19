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
  const mapCenter = { lat: 51.1079, lng: 17.0385 }; // Wrocław

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
    fetch('/api/taxis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: taxis.length + 1,
        name: `Taxi ${taxis.length + 1}`,
        location: { lat: 51.1079, lng: 17.0385 }, // Przykładowa lokalizacja we Wrocławiu
        available: true,
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(newTaxi => setTaxis(prevTaxis => [...prevTaxis, newTaxi]))
    .catch(error => console.error('Error adding taxi:', error));
  };

  const handleAddClient = () => {
    fetch('/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: clients.length + 1,
        name: `Client ${clients.length + 1}`,
        location: { lat: 51.107885, lng: 17.037500 }, // Przykładowa lokalizacja we Wrocławiu 
        waiting: true,
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(newClient => setClients(prevClients => [...prevClients, newClient]))
    .catch(error => console.error('Error adding client:', error));
  };

  const handleStartSimulation = () => {
    fetch("/api/simulation/start")
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
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
      .then(() => {
        setTaxis([]); // Czyścimy listę taksówek po restarcie
        handleStartSimulation(); // Automatycznie uruchamiamy symulację po restarcie
      })
      .catch(error => console.error("Error restarting simulation:", error));
  };

  const handleSettings = () => {
    fetch("/api/settings")
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => console.log("Settings:", data))
      .catch(error => console.error("Error fetching settings:", error));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`App ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <Map center={mapCenter} zoom={12} taxis={taxis} clients={clients} />
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

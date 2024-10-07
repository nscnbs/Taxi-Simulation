import React, { useState, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import ListWindow from './components/ListWindow'; // Importuj komponent ListWindow
import SettingsWindow from './components/SettingsWindow'; // Importuj komponent ListWindow
import Map from './components/Map';
import './App.css';
import { Taxi, Client, LatLng } from './types';

// Funkcja do obliczania odległości między dwoma punktami
const getDistance = (loc1: LatLng, loc2: LatLng) => {
  const R = 6371; // Promień Ziemi w km
  const lat1 = (loc1.lat * Math.PI) / 180;
  const lat2 = (loc2.lat * Math.PI) / 180;
  const deltaLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const deltaLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Odległość w km
};

// Znalezienie najbliższego klienta
const findClosestClient = (taxiLocation: LatLng, clients: Client[]): Client | null => {
  let closestClient: Client | null = null;
  let minDistance = Infinity;

  clients.forEach((client) => {
    if (client.waiting && !client.busy) {
      const distance = getDistance(taxiLocation, client.location);
      if (distance < minDistance) {
        closestClient = client;
        minDistance = distance;
      }
    }
  });

  return closestClient;
};

function App() {
  const [taxis, setTaxis] = useState<Taxi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [showList, setShowList] = useState(false);
  const [speed, setSpeed] = useState<number>(2000); // Domyślna prędkość
  const [showSettings, setShowSettings] = useState(false); // Stan do kontrolowania wyświetlania okna ustawień
  
  const mapCenter = { lat: 51.1079, lng: 17.0385 }; // Wrocław

  // Funkcja do symulacji, uruchamiana co kilka sekund

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isSimulationActive) {
      interval = setInterval(() => {
        setTaxis((prevTaxis) => {
          return prevTaxis.map((taxi) => {
            if (taxi.available && !taxi.busy) {
              const closestClient = findClosestClient(taxi.location, clients);
              if (closestClient) {
                taxi.route = [closestClient.location];
                taxi.available = false;
                taxi.waiting = true;
                taxi.busy = false;
                closestClient.available = false;
                closestClient.waiting = true;
                closestClient.busy = false;
                return { ...taxi, location: closestClient.location };
              }
            } else if (taxi.route && taxi.route.length > 0) {
              taxi.location = taxi.route[0];
              taxi.route.shift();
              if (taxi.route.length === 0) {
                taxi.available = true;
                taxi.busy = false;
              }
            }
            return taxi;
          });
        });
      }, speed); // Używamy prędkości z ustawień
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulationActive, clients, speed]);


  const handleAddTaxi = () => {
    const randomLocation = {
      lat: 51.1079 + (Math.random() - 0.5) * 0.04,
      lng: 17.0385 + (Math.random() - 0.5) * 0.04,
    };
    const newTaxi: Taxi = {
      id: taxis.length + 1,
      name: `Taxi ${taxis.length + 1}`,
      location: randomLocation,
      available: true,
      waiting: false,
      busy: false,
      route: [],
    };
    setTaxis((prevTaxis) => [...prevTaxis, newTaxi]);
  };

  const handleAddClient = () => {
    const randomLocation = {
      lat: 51.1079 + (Math.random() - 0.5) * 0.08,
      lng: 17.0385 + (Math.random() - 0.5) * 0.08,
    };
    const newClient: Client = {
      id: clients.length + 1,
      name: `Client ${clients.length + 1}`,
      location: randomLocation,
      available: true,
      waiting: false,
      busy: false,
    };
    setClients((prevClients) => [...prevClients, newClient]);
  };

  const handleStartSimulation = () => {
    setIsSimulationActive(true);
  };

  const handleRestartSimulation = () => {
    setTaxis([]); // Czyścimy listę taksówek po restarcie
    setIsSimulationActive(false);
  };

  const handleStopSimulation = () => {
    setIsSimulationActive(false);
  };

  const handlePauseSimulation = () => {
    if (isSimulationActive) {
        setIsSimulationActive(false);
    }
    else{
        handleStartSimulation(); // Wznów symulację
    }
  };
  

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const handleSettings = () => {
    setShowSettings((prev) => !prev);
  };

  const toggleList = () => {
    setShowList((prev) => !prev);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`App ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Map 
            center={mapCenter} 
            zoom={14} 
            taxis={taxis} 
            clients={clients} 
            isSimulationActive={isSimulationActive}
            speed={speed} 
        />
        <ListWindow show={showList} onClose={() => setShowList(false)} taxis={taxis} clients={clients} /> {/* Użyj ListWindow */}
        <SettingsWindow show={showSettings} onClose={() => setShowSettings(false)} onSpeedChange={handleSpeedChange} />
        <div className={`control-panel ${sidebarOpen ? '' : 'sidebar-closed'}`}>
            <ControlPanel
                onStartSimulation={handleStartSimulation}
                onPauseSimulation={handlePauseSimulation}
                onAddTaxi={handleAddTaxi}
                onAddClient={handleAddClient}
                onStopSimulation={handleStopSimulation}
                onRestartSimulation={handleRestartSimulation}
                onToggleList={toggleList}
                onSettings={handleSettings}
                isSimulationActive={isSimulationActive}
            />
        </div>
        <button className="toggle-button" onClick={toggleSidebar}>
            {sidebarOpen ? '⮜' : '⮞'}
        </button>
    </div>
  );
}


export default App;

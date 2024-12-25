import React, { useState, useEffect, useCallback, useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import ListWindow from './components/ListWindow';
import SettingsWindow from './components/SettingsWindow';
import MapComponent, { MapHandle } from './components/mapUtils';
import './App.css';
import { Taxi, Client, LatLng, Status } from './types';
import { findClosestTaxi, calculateRoute, generateInterpolatedRoute } from './services/routeUtils';


function App() {
  const [taxis, setTaxis] = useState<Taxi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showList, setShowList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState<number>(10);
  const [interPoints, setInterPoints] = useState<number>(100);
  const [taxiRoutes, setTaxiRoutes] = useState<Map<number, google.maps.LatLng[]>>(new Map());
  const [taxiPolylines, setTaxiPolylines] = useState<Map<number, google.maps.Polyline>>(new Map());


  const lockedTaxis = new Set<number>();
  const lockedClients = new Set<number>();

  const mapRef = useRef<MapHandle>(null);
  const mapCenter = { lat: 51.1079, lng: 17.0385 }; // Wrocław Centrum

  const moveTaxiAlongRoute = useCallback(
    async (taxi: Taxi, target: { location: LatLng }, route: google.maps.DirectionsRoute, onFinish: () => void) => {
      const fullInterpolatedRoute = generateInterpolatedRoute(route, interPoints);
  
      // Zapisujemy interpolowane trasy w mapie z kluczem jako `taxi.id`
      setTaxiRoutes((prev) => new Map(prev).set(taxi.id, fullInterpolatedRoute));
      
      mapRef.current?.drawRoute(taxi.id, fullInterpolatedRoute);

      let stepIndex = 0;
      const moveInterval = setInterval(() => {
        if (stepIndex >= fullInterpolatedRoute.length) {
          clearInterval(moveInterval);
          mapRef.current?.clearRoute(taxi.id);
          onFinish(); // Wywołujemy funkcję po zakończeniu
          return;
        }
  
        const nextPoint = fullInterpolatedRoute[stepIndex];
        taxi.location = { lat: nextPoint.lat(), lng: nextPoint.lng() };
        setTaxis((prev) =>
          prev.map((t) => (t.id === taxi.id ? { ...t, location: taxi.location } : t))
        );

        
        mapRef.current?.clearRouteSegment(taxi.id, stepIndex);

        stepIndex += Math.ceil(speed / 5);
      }, speed);
  
      return () => clearInterval(moveInterval);
    },
    [interPoints, speed, setTaxis]
  );


  const updateStatus = <T extends Taxi | Client>(
    entities: T[],
    setEntities: React.Dispatch<React.SetStateAction<T[]>>,
    entityId: number,
    newStatus: Status
  ) => {
    setEntities((prevEntities) =>
      prevEntities.map((entity) =>
        entity.id === entityId ? { ...entity, status: newStatus } : entity
      )
    );
  };
  
  
  const assignTaxiToClient = useCallback(
    async (taxi: Taxi, client: Client) => {
      if (lockedTaxis.has(taxi.id) || lockedClients.has(client.id)) return; // Sprawdzamy blokadę
  
      lockedTaxis.add(taxi.id);
      lockedClients.add(client.id);
  
      updateStatus<Client>(clients, setClients, client.id, Status.Busy);
      updateStatus<Taxi>(taxis, setTaxis, taxi.id, Status.Busy);
  
      try {
        const routeToClient = await calculateRoute(taxi, client);
  
        await new Promise<void>((resolve) =>
          moveTaxiAlongRoute(taxi, client, routeToClient, async () => {
            // Po dotarciu do klienta
            const destination = {
              lat: mapCenter.lat + (Math.random() - 0.5) * 0.08,
              lng: mapCenter.lng + (Math.random() - 0.5) * 0.08,
            };

            if (mapRef.current) {
              const destinationMarker = mapRef.current.addDestinationMarker(
                new google.maps.LatLng(destination.lat, destination.lng)
              );
  
            const temporaryClient: Client = {
              id: -1,
              name: 'Destination',
              location: destination,
              status: Status.Available,
              isLocked: true,
            };
  
            const routeToDestination = await calculateRoute(taxi, temporaryClient);

            updateStatus<Client>(clients, setClients, client.id, Status.Finished);
  
            await new Promise<void>((resolveDestination) =>
              moveTaxiAlongRoute(taxi, { location: destination }, routeToDestination, () => {
                mapRef.current?.removeDestinationMarker(destinationMarker);
                updateStatus<Taxi>(taxis, setTaxis, taxi.id, Status.Available);

                setTaxis((prev) =>
                  prev.map((t) =>
                    t.id === taxi.id ? { ...t, rides: t.rides + 1 } : t
                  )
                );                
  
                lockedTaxis.delete(taxi.id);
                lockedClients.delete(client.id);
                resolveDestination();
              }) 
            );
            resolve();
          }
          })
        );
      } catch (error) {
        console.error("Error during taxi-client assignment:", error);
        updateStatus<Client>(clients, setClients, client.id, Status.Available);
        updateStatus<Taxi>(taxis, setTaxis, taxi.id, Status.Available);
  
        lockedTaxis.delete(taxi.id); // Odblokowujemy w przypadku błędu
        lockedClients.delete(client.id);
      }
    },
    [clients, taxis, moveTaxiAlongRoute]
  );
  

  useEffect(() => {
    if (isSimulationActive) {
      const interval = setInterval(async () => {
        const availableClients = clients.filter(
          (client) => client.status === Status.Available && !client.isLocked
        );
        const availableTaxis = taxis.filter(
          (taxi) => taxi.status === Status.Available && !taxi.isLocked
        );
  
        for (const client of availableClients) {
          const closestTaxi = await findClosestTaxi(client.location, availableTaxis);
          if (closestTaxi) {
            assignTaxiToClient(closestTaxi, client); // Wywołanie asynchroniczne
          }
        }
      }, 1000);
  
      return () => clearInterval(interval);
    }
  }, [isSimulationActive, clients, taxis, assignTaxiToClient]);


  const generateLocation = {
    lat: mapCenter.lat + (Math.random() - 0.5) * 0.08,
    lng: mapCenter.lng + (Math.random() - 0.5) * 0.08,
  };

  const handleAddTaxi = () => {
    const newTaxi: Taxi = {
      id: taxis.length + 1,
      name: `Taxi ${taxis.length + 1}`,
      location: generateLocation,
      status: Status.Available,
      isLocked: false,
      rides: 0,
    };
    setTaxis((prevTaxis) => [...prevTaxis, newTaxi]);
  };

  const handleClientLifecycle = useCallback((client: Client) => {
    const randomTime = Math.random() * 9 + 1; // 1-10 sekund
    setTimeout(() => {
      updateStatus<Client>(clients, setClients, client.id, Status.Available);
    }, randomTime * 1000);
  }, [clients]);

  const handleAddClient = () => {
    const newClient: Client = {
      id: clients.length + 1,
      name: `Client ${clients.length + 1}`,
      location: generateLocation,
      status: Status.Hibernate,
      isLocked: false,
    };
    setClients((prevClients) => [...prevClients, newClient]);
    handleClientLifecycle(newClient);
  };

  const handleStartSimulation = () => {
    setIsSimulationActive(true);
  };

  const handleRestartSimulation = () => {
    setTaxis([]);
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
        handleStartSimulation();
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
        <MapComponent 
            ref={mapRef}
            center={mapCenter} 
            zoom={13} 
            taxis={taxis} 
            clients={clients} 
            taxiRoutes={taxiRoutes}
            setTaxiRoutes={setTaxiRoutes}
            taxiPolylines={taxiPolylines}
            setTaxiPolylines={setTaxiPolylines}
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

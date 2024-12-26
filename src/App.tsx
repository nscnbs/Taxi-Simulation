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
  const [activeAssignments, setActiveAssignments] = useState<Set<string>>(new Set());
  const [isProcessingClients, setIsProcessingClients] = useState(false);


  const mapRef = useRef<MapHandle>(null);
  const mapCenter = { lat: 51.1079, lng: 17.0385 }; // Wrocław Centrum

  const semaphore = new Map<number, Promise<void>>();
  const generateUniqueAssignmentKey = (taxiId: number, clientId: number) => `${taxiId}-${clientId}`;

  
  const moveTaxiAlongRoute = useCallback(
    async (
      taxi: Taxi,
      target: { location: LatLng },
      route: google.maps.DirectionsRoute,
      onFinish: () => void
    ) => {
      const fullInterpolatedRoute = generateInterpolatedRoute(route, interPoints);
      setTaxiRoutes((prev) => new Map(prev).set(taxi.id, fullInterpolatedRoute));
      mapRef.current?.drawRoute(taxi.id, fullInterpolatedRoute);

      let stepIndex = 0;

      const move = () => {
        if (!isSimulationActive) return; // Wstrzymanie symulacji
        if (stepIndex >= fullInterpolatedRoute.length) {
          mapRef.current?.clearRoute(taxi.id);
          setTaxiRoutes((prev) => {
            const newRoutes = new Map(prev);
            newRoutes.delete(taxi.id);
            return newRoutes;
          });
          onFinish();
          return;
        }

        const nextPoint = fullInterpolatedRoute[stepIndex];
        taxi.location = { lat: nextPoint.lat(), lng: nextPoint.lng() };
        setTaxis((prev) =>
          prev.map((t) => (t.id === taxi.id ? { ...t, location: taxi.location } : t))
        );
        mapRef.current?.clearRouteSegment(taxi.id, stepIndex);

        stepIndex += Math.ceil(speed / 5);
        requestAnimationFrame(move);
      };

      move();
    },
    [interPoints, speed, isSimulationActive]
  );




  const updateStatus = <T extends Taxi | Client>(
    entities: T[],
    setEntities: React.Dispatch<React.SetStateAction<T[]>>,
    entityId: number,
    newStatus: Status
  ) => {
    setEntities((prevEntities) =>
        prevEntities.map((entity) =>
            entity.id === entityId && entity.status !== newStatus
                ? { ...entity, status: newStatus }
                : entity
        )
    );
  };

  
  
  const assignTaxiToClient = useCallback(
    async (taxi: Taxi, client: Client) => {      
      const assignmentKey = generateUniqueAssignmentKey(taxi.id, client.id);
      if (
        taxi.status !== Status.Available ||
        client.status !== Status.Available ||
        activeAssignments.has(assignmentKey) ||
        semaphore.has(taxi.id) // Dodano sprawdzenie
      ) {
        console.log(`Assignment skipped for Taxi ${taxi.id} and Client ${client.id}`);
        return;
      }
  
      setActiveAssignments((prev) => new Set(prev).add(assignmentKey));

  
      try {
        await acquireTaxiLock(taxi.id);

        console.log(`Taxi ${taxi.id} assigned to Client ${client.id}`);
        updateStatus<Client>(clients, setClients, client.id, Status.Busy);
        updateStatus<Taxi>(taxis, setTaxis, taxi.id, Status.Busy);

        const routeToClient = await calculateRoute(taxi.location, client.location);
        console.log(`Taxi ${taxi.id} starts moving to Client ${client.id}`);
  
        await new Promise<void>((resolve) =>
          moveTaxiAlongRoute(taxi, client, routeToClient, async () => {
            console.log(`Taxi ${taxi.id} finished moving to Client ${client.id}`);
            // Po dotarciu do klienta
            const destination = {
              lat: mapCenter.lat + (Math.random() - 0.5) * 0.08,
              lng: mapCenter.lng + (Math.random() - 0.5) * 0.08,
            };

            if (mapRef.current) {
              const destinationMarker = mapRef.current.addDestinationMarker(
                new google.maps.LatLng(destination.lat, destination.lng)
              );
  
  
            const routeToDestination = await calculateRoute(taxi.location, destination);
            console.log(`Taxi ${taxi.id} starts moving to destination for Client ${client.id}`);
            
            updateStatus<Client>(clients, setClients, client.id, Status.Finished);
  
            await new Promise<void>((resolveDestination) =>
              moveTaxiAlongRoute(taxi, { location: destination }, routeToDestination, () => {
                console.log(`Taxi ${taxi.id} finished trip. Client ${client.id} is finished`);
                mapRef.current?.removeDestinationMarker(destinationMarker);
                console.log(`Taxi ${taxi.id} finished trip.`);

                updateStatus<Taxi>(taxis, setTaxis, taxi.id, Status.Available);
                
                setTaxis((prev) =>
                  prev.map((t) =>
                    t.id === taxi.id ? { ...t, rides: t.rides + 1 } : t
                  )
                );                
                resolveDestination();
              }) 
            );
            resolve();
          }
          })
        );
      } catch (error) {
        updateStatus<Client>(clients, setClients, client.id, Status.Available);
        updateStatus<Taxi>(taxis, setTaxis, taxi.id, Status.Available);
        console.error("Error during taxi-client assignment:", error);
      } finally{
        releaseTaxiLock(taxi.id);
        // Usunięcie klucza z aktywnych przydziałów
        setActiveAssignments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(assignmentKey);
        return newSet;
      });
      }
    },
    [clients, taxis, moveTaxiAlongRoute, activeAssignments]
  );
  

  const acquireTaxiLock = async (taxiId: number) => {
    if (semaphore.has(taxiId)) {
      return semaphore.get(taxiId);
    }
    const lock = Promise.resolve();
    semaphore.set(taxiId, lock);
    return lock;
  };
  
  const releaseTaxiLock = (taxiId: number) => {
    semaphore.delete(taxiId);
  };
  

  const processClients = useCallback(async () => {
    if (isProcessingClients) return; // Zapobiega wielokrotnemu uruchomieniu
  
    setIsProcessingClients(true);
    try {
      const availableClients = clients.filter((client) => client.status === Status.Available);
  
      await Promise.all(
        availableClients.map(async (client) => {
          // Filtruj dostępne taksówki uwzględniając ich stan i blokadę
          const availableTaxis = taxis.filter(
            (taxi) =>
              taxi.status === Status.Available &&
              !activeAssignments.has(generateUniqueAssignmentKey(taxi.id, client.id)) &&
              !semaphore.has(taxi.id) // Sprawdź, czy taksówka nie jest aktualnie w użyciu
          );
  
          if (availableTaxis.length === 0) return;
  
          const closestTaxi = await findClosestTaxi(client.location, availableTaxis);
          if (closestTaxi) {
            assignTaxiToClient(closestTaxi, client);
          }
        })
      );
    } finally {
      setIsProcessingClients(false);
    }
  }, [clients, taxis, activeAssignments, assignTaxiToClient, isProcessingClients]);
  
  

  

  useEffect(() => {
    if (isSimulationActive) {
      processClients();
    }
  }, [clients, taxis, isSimulationActive, processClients]);
  
  

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

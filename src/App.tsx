import React, { useState, useEffect, useCallback, useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import ListWindow from './components/ListWindow';
import SettingsWindow from './components/SettingsWindow';
import Map, { MapHandle } from './components/Map';
import './App.css';
import { Taxi, Client, LatLng, Status } from './types';
import { findClosestTaxi, calculateRoute, getDistance } from './services/routeUtils';


function App() {
  const [taxis, setTaxis] = useState<Taxi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [showList, setShowList] = useState(false);
  const [speed, setSpeed] = useState<number>(10);
  const [interPoints, setInterPoints] = useState<number>(100);
  const [showSettings, setShowSettings] = useState(false);
  const [route, setRoute] = useState<google.maps.DirectionsRoute | null>(null);
  const [interpolatedRoute, setInterpolatedRoute] = useState<google.maps.LatLng[]>([]);

  const mapCenter = { lat: 51.1079, lng: 17.0385 }; // Wrocław Centrum

  const mapRef = useRef<MapHandle>(null);

  const interpolatePoints = (start: google.maps.LatLng, end: google.maps.LatLng, numPoints: number): google.maps.LatLng[] => {
    const interpolatedPoints: google.maps.LatLng[] = [];
    const latStep = (end.lat() - start.lat()) / numPoints;
    const lngStep = (end.lng() - start.lng()) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const lat = start.lat() + latStep * i;
      const lng = start.lng() + lngStep * i;
      interpolatedPoints.push(new google.maps.LatLng(lat, lng));
    }

    return interpolatedPoints;
  };

  const moveTaxiAlongRoute = useCallback(
    async (taxi: Taxi, target: { location: LatLng }, route: google.maps.DirectionsRoute, onFinish: () => void) => {
      if (taxi.isLocked) return;
  
      taxi.isLocked = true;
      updateStatus<Taxi>(taxis, setTaxis, taxi.id, Status.Busy);
  
      const steps = route.legs[0].steps;
      const fullInterpolatedRoute = steps.flatMap((step) =>
        interpolatePoints(step.start_location, step.end_location, interPoints)
      );
  
      setInterpolatedRoute(fullInterpolatedRoute);
  
      let stepIndex = 0;
      const moveInterval = setInterval(() => {
        if (stepIndex >= fullInterpolatedRoute.length) {
          clearInterval(moveInterval);
          taxi.isLocked = false;
          console.log("Koniec trasy");
          onFinish(); // Wywołujemy funkcję po zakończeniu
          return;
        }
  
        const nextPoint = fullInterpolatedRoute[stepIndex];
        taxi.location = { lat: nextPoint.lat(), lng: nextPoint.lng() };
        setTaxis((prev) =>
          prev.map((t) => (t.id === taxi.id ? { ...t, location: taxi.location } : t))
        );

        mapRef.current?.handleClearRouteSegment(stepIndex);

        stepIndex += Math.ceil(speed / 5);
      }, speed);
  
      return () => clearInterval(moveInterval);
    },
    [interPoints, speed, taxis, setTaxis]
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


  const assignTaxiToClient = useCallback(async (client: Client) => {
    const availableTaxis = taxis.filter((taxi) => taxi.status === Status.Available);
    if (availableTaxis.length === 0) return;

    const closestTaxi = await findClosestTaxi(client.location, availableTaxis);
    if (!closestTaxi) return;


    updateStatus<Client>(clients, setClients, client.id, Status.Busy);
    updateStatus<Taxi>(taxis, setTaxis, closestTaxi.id, Status.Busy);


    const routeToClient = await calculateRoute(closestTaxi, client);

    const steps = routeToClient.legs[0].steps;
    const interpolatedToClient = steps.flatMap((step) =>
      interpolatePoints(step.start_location, step.end_location, interPoints)
    );

    setInterpolatedRoute(interpolatedToClient);
    mapRef.current?.drawRoute(interpolatedToClient);

    // Ruch taksówki do klienta
    moveTaxiAlongRoute(closestTaxi, client, routeToClient, async () => {
      // Po dotarciu do klienta
      const destination = {
        lat: mapCenter.lat + (Math.random() - 0.5) * 0.08,
        lng: mapCenter.lng + (Math.random() - 0.5) * 0.08,
      };

      if (mapRef.current) {
        const destinationMarker = mapRef.current.addDestinationMarker(
          new google.maps.LatLng(destination.lat, destination.lng)
        );
        console.log('Marker punktu docelowego dodany:', destinationMarker);

        // Pobieramy trasę do punktu docelowego
        const temporaryClient: Client = {
          id: -1, // Tymczasowe ID
          name: 'Destination',
          location: destination,
          status: Status.Available,
        };
        const routeToDestination = await calculateRoute(closestTaxi, temporaryClient);
        const steps = routeToClient.legs[0].steps;
        const interpolatedToDestination = steps.flatMap((step) =>
          interpolatePoints(step.start_location, step.end_location, interPoints)
        );
      
        setInterpolatedRoute(interpolatedToDestination);
        mapRef.current?.drawRoute(interpolatedToDestination);
      

        moveTaxiAlongRoute(closestTaxi, { location: destination }, routeToDestination, () => {
          mapRef.current?.removeDestinationMarker(destinationMarker);
          closestTaxi.rides += 1;
          console.log(closestTaxi.rides);
          updateStatus<Client>(clients, setClients, client.id, Status.Hibernate);
          updateStatus<Taxi>(taxis, setTaxis, closestTaxi.id, Status.Available);
        });
      }
    });
  }, [taxis, clients, calculateRoute, moveTaxiAlongRoute]);

  useEffect(() => {
    if (isSimulationActive) {
      const interval = setInterval(() => {
        clients.forEach((client) => {
          if (client.status === Status.Available) {
            assignTaxiToClient(client);
          }
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSimulationActive, clients, assignTaxiToClient]);

  const handleAddTaxi = () => {
    const randomLocation = {
      lat: 51.1079 + (Math.random() - 0.5) * 0.04,
      lng: 17.0385 + (Math.random() - 0.5) * 0.04,
    };
    const newTaxi: Taxi = {
      id: taxis.length + 1,
      name: `Taxi ${taxis.length + 1}`,
      location: randomLocation,
      status: Status.Available,
      route: [],
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
    const randomLocation = {
      lat: mapCenter.lat + (Math.random() - 0.5) * 0.08,
      lng: mapCenter.lng + (Math.random() - 0.5) * 0.08,
    };
    const newClient: Client = {
      id: clients.length + 1,
      name: `Client ${clients.length + 1}`,
      location: randomLocation,
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
        <Map 
            ref={mapRef}
            center={mapCenter} 
            zoom={13} 
            taxis={taxis} 
            clients={clients} 
            isSimulationActive={isSimulationActive}
            speed={speed} 
            route={route}
            interpolatedRoute={interpolatedRoute}
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

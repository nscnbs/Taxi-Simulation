import React, { useState, useEffect, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import ListWindow from './components/ListWindow';
import SettingsWindow from './components/SettingsWindow';
import Map from './components/Map';
import './App.css';
import { Taxi, Client, LatLng } from './types';


function App() {
  const [taxis, setTaxis] = useState<Taxi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [showList, setShowList] = useState(false);
  const [speed, setSpeed] = useState<number>(10);
  const [points, setPoints] = useState<number>(100);
  const [showSettings, setShowSettings] = useState(false);
  const [route, setRoute] = useState<google.maps.DirectionsRoute | null>(null);
  const [interpolatedRoute, setInterpolatedRoute] = useState<google.maps.LatLng[]>([]);

  const mapCenter = { lat: 51.1079, lng: 17.0385 }; // Wrocław

  const getDistance = async (origin: LatLng, destination: LatLng) => {
    const directionsService = new google.maps.DirectionsService();
    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.PESSIMISTIC
      }
    };

    return new Promise<number>((resolve, reject) => {
      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result && result.routes.length > 0) {
          const route = result.routes[0];
          const distance = route.legs[0].distance?.value || 0;
          resolve(distance);
        } else {
          reject('Unable to calculate route');
        }
      });
    });
  };

  const findClosestTaxi = useCallback(async (clientLocation: LatLng, availableTaxis: Taxi[]): Promise<Taxi | null> => {
    let closestTaxi: Taxi | null = null;
    let minDistance = Infinity;
  
    for (const taxi of availableTaxis) {
      try {
        const distance = await getDistance(taxi.location, clientLocation);
        if (distance < minDistance) {
          minDistance = distance;
          closestTaxi = taxi;
        }
      } catch (error) {
        console.error('Error calculating distance:', error);
      }
    }
    return closestTaxi;
  }, []);

  const calculateRoute = useCallback(async (taxi: Taxi, client: Client): Promise<google.maps.DirectionsRoute> => {
    const directionsService = new google.maps.DirectionsService();
    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(taxi.location.lat, taxi.location.lng),
      destination: new google.maps.LatLng(client.location.lat, client.location.lng),
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true, // Dodane, by trasa była jak najbardziej optymalna
    };

    return new Promise((resolve, reject) => {
      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result) {
          console.log(result); // dodaj to
          resolve(result.routes[0]);
        } else {
          reject('Could not calculate route');
        }
      });
    });
  }, []);

  const drawRoute = (route: google.maps.DirectionsRoute) => {
    console.log('Route drawn:', route);
    setRoute(route);
  };

  const clearRouteSegment = (segmentIndex: number) => {
    setInterpolatedRoute((prevRoute) => {
        return prevRoute.slice(segmentIndex); // Aktualizujemy trasę, wycinając segmenty do określonego indeksu
    });
  };

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

  const moveTaxiAlongRoute = useCallback((taxi: Taxi, client: Client, route: google.maps.DirectionsRoute, speed: number) => {
    let step = 0;
    const steps = route.legs[0].steps;
    
    const fullInterpolatedRoute = steps.flatMap((step) => interpolatePoints(step.start_location, step.end_location, points));
    setInterpolatedRoute(fullInterpolatedRoute);
  
    const moveInterval = setInterval(() => {
      if (step >= fullInterpolatedRoute.length) {
        clearInterval(moveInterval);
        setInterpolatedRoute([]); // Очищаем маршрут при завершении
  
        updateTaxiAndClientStatus(taxi.id, client.id, false, false, true);
        return;
      }
  
      const newPosition = fullInterpolatedRoute[step];
      setTaxis((prevTaxis) =>
        prevTaxis.map((t) => (t.id === taxi.id ? { ...t, location: { lat: newPosition.lat(), lng: newPosition.lng() } } : t))
      );
  
      clearRouteSegment(step);
  
      step++;
    }, speed);
  }, [setTaxis, setClients, speed, clearRouteSegment]);


  const updateTaxiAndClientStatus = (taxiId: number, clientId: number, available: boolean, waiting: boolean, busy: boolean) => {
    if(available){
      setTaxis(prevTaxis =>
        prevTaxis.map(t =>
          t.id === taxiId ? { ...t, available: true, waiting: false, busy: false } : t
        )
      );
    
      setClients(prevClients =>
        prevClients.map(c =>
          c.id === clientId ? { ...c, available: true, waiting: false, busy: false } : c
        )
      );
    }
    else if(waiting){
      setTaxis(prevTaxis =>
        prevTaxis.map(t =>
          t.id === taxiId ? { ...t, available: false, waiting: true, busy: false } : t
        )
      );
    
      setClients(prevClients =>
        prevClients.map(c =>
          c.id === clientId ? { ...c, available: false, waiting: true, busy: false } : c
        )
      );
    }
    else if(busy){
        setTaxis(prevTaxis =>
          prevTaxis.map(t =>
            t.id === taxiId ? { ...t, available: false, waiting: false, busy: true } : t
          )
        );
      
        setClients(prevClients =>
          prevClients.map(c =>
            c.id === clientId ? { ...c, available: false, waiting: false, busy: true } : c
          )
        );
      }
    };
  

  useEffect(() => {
    const simulate = async () => {
      if (!isSimulationActive) return;
  
      const availableClients = clients.filter(client => client.available);
      const availableTaxis = taxis.filter(taxi => taxi.available && !taxi.busy && !taxi.waiting);
  
      for (const client of availableClients) {
        const closestTaxi = await findClosestTaxi(client.location, availableTaxis);
        if (closestTaxi) {
          const route = await calculateRoute(closestTaxi, client);
          drawRoute(route);
          moveTaxiAlongRoute(closestTaxi, client, route, speed);
  
          updateTaxiAndClientStatus(closestTaxi.id, client.id, false, true, false);
        }
      }
    };
  
    const interval = setInterval(simulate, speed);
    return () => clearInterval(interval);
  }, [isSimulationActive, clients, taxis, findClosestTaxi, calculateRoute, moveTaxiAlongRoute, speed]);
  


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
            zoom={13} 
            taxis={taxis} 
            clients={clients} 
            isSimulationActive={isSimulationActive}
            speed={speed} 
            onRouteDrawn={route => drawRoute(route)}
            route={route}
            interpolatedRoute={interpolatedRoute}
            clearRouteSegment={clearRouteSegment}
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

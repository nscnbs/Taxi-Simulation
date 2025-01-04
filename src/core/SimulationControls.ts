import { useEffect, useCallback } from "react";
import { Taxi } from "../types/Taxi";
import { Client } from "../types/Client";
import { Status } from "../types/Simulation";
import { useSimulationManager } from "../core/SimulationManager";
import { useSimulation } from "../context/SimulationContext";
import { useGenerateRandomLocation } from "../utils/randomUtils";

export const useSimulationControls = () => {
  const {
    taxis,
    setTaxis,
    clients,
    setClients,
    isSimulationActive,
    setIsSimulationActive,
    setMapKey,
    mapRef,
    setTaxiRoutes,
    setTaxiPolylines,
    setSpeed,
    setShowSettings,
    setShowList,
    setSidebarOpen,
    sidebarOpen,
  } = useSimulation();

  const { processClients, updateStatus } = useSimulationManager();
  const generateRandomLocation = useGenerateRandomLocation();

  useEffect(() => {
    if (isSimulationActive) {
      const hasAvailableClients = clients.some(
        (client) => client.status === Status.Available
      );
      const hasAvailableTaxis = taxis.some(
        (taxi) => taxi.status === Status.Available
      );

      if (hasAvailableClients && hasAvailableTaxis) {
        processClients();
      }
    }
  }, [clients, taxis, isSimulationActive, processClients]);

  const handleAddTaxi = () => {
    const newTaxi: Taxi = {
      id: taxis.length + 1,
      name: `Taxi ${taxis.length + 1}`,
      location: generateRandomLocation(),
      status: Status.Available,
      rides: 0,
    };
    setTaxis((prevTaxis) => [...prevTaxis, newTaxi]);
  };

  const handleClientLifecycle = useCallback(
    (client: Client) => {
      const randomTime = Math.random() * 9 + 1; // 1-10 seconds
      setTimeout(() => {
        updateStatus<Client>(clients, setClients, client.id, Status.Available);
      }, randomTime * 1000);
    },
    [clients, setClients, updateStatus]
  );

  const handleAddClient = () => {
    const newClient: Client = {
      id: clients.length + 1,
      name: `Client ${clients.length + 1}`,
      location: generateRandomLocation(),
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
    setClients([]);
    setTaxiRoutes(new Map());
    setTaxiPolylines(new Map());
    mapRef.current?.clearAllRoutes();
    mapRef.current?.resetMap();
    setMapKey((prevKey) => prevKey + 1);
    setIsSimulationActive(false);
  };

  const handlePauseSimulation = () => {
    setIsSimulationActive((prev) => !prev);
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

  return {
    handleAddTaxi,
    handleAddClient,
    handleStartSimulation,
    handleRestartSimulation,
    handlePauseSimulation,
    handleSpeedChange,
    handleSettings,
    toggleList,
    toggleSidebar,
  };
};

import React, { createContext, useContext, useState, useRef } from "react";
import { Taxi } from "../types/Taxi";
import { Client } from "../types/Client";
import { MapHandle } from "../components/MapComponent";

const SimulationContext = createContext<SimulationContextType | null>(null);

interface SimulationContextType {
  taxis: Taxi[];
  setTaxis: React.Dispatch<React.SetStateAction<Taxi[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  taxiRoutes: Map<number, google.maps.LatLng[]>;
  setTaxiRoutes: React.Dispatch<
    React.SetStateAction<Map<number, google.maps.LatLng[]>>
  >;
  taxiPolylines: Map<number, google.maps.Polyline>;
  setTaxiPolylines: React.Dispatch<
    React.SetStateAction<Map<number, google.maps.Polyline>>
  >;
  mapRef: React.RefObject<any>;
  activeAssignments: Set<string>;
  setActiveAssignments: React.Dispatch<React.SetStateAction<Set<string>>>;
  semaphore: Map<number, Promise<void>>;
  trafficModel: string;
  setTrafficModel: React.Dispatch<React.SetStateAction<string>>;
  distanceMetric: string;
  setDistanceMetric: React.Dispatch<React.SetStateAction<string>>;
  isProcessingClients: boolean;
  setIsProcessingClients: React.Dispatch<React.SetStateAction<boolean>>;
  isSimulationActive: boolean;
  setIsSimulationActive: React.Dispatch<React.SetStateAction<boolean>>;
  interPoints: number;
  setInterPoints: React.Dispatch<React.SetStateAction<number>>;
  speed: number;
  setSpeed: React.Dispatch<React.SetStateAction<number>>;
  mapKey: number;
  setMapKey: React.Dispatch<React.SetStateAction<number>>;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showList: boolean;
  setShowList: React.Dispatch<React.SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  mapCenter: { lat: number; lng: number };
  randomRange: number;
}

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [taxis, setTaxis] = useState<Taxi[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [taxiRoutes, setTaxiRoutes] = useState<
    Map<number, google.maps.LatLng[]>
  >(new Map());
  const [taxiPolylines, setTaxiPolylines] = useState<
    Map<number, google.maps.Polyline>
  >(new Map());
  const [activeAssignments, setActiveAssignments] = useState<Set<string>>(
    new Set()
  );
  const [isProcessingClients, setIsProcessingClients] = useState(false);
  const [interPoints, setInterPoints] = useState<number>(100);

  const [mapKey, setMapKey] = useState(0);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showList, setShowList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Domyślne ustawienia
  const [speed, setSpeed] = useState<number>(10);
  const [trafficModel, setTrafficModel] = useState<string>("pessimistic");
  const [distanceMetric, setDistanceMetric] = useState("duration");

  const semaphore = new Map<number, Promise<void>>();

  const mapCenter = { lat: 51.1079, lng: 17.0385 }; // Wrocław Centrum
  const randomRange = 0.08; // Promień Generacji Lokalizacji

  const mapRef = useRef<MapHandle>(null);

  const contextValue = {
    taxis,
    setTaxis,
    taxiRoutes,
    setTaxiRoutes,
    taxiPolylines,
    setTaxiPolylines,
    clients,
    setClients,
    isProcessingClients,
    setIsProcessingClients,
    activeAssignments,
    setActiveAssignments,
    isSimulationActive,
    setIsSimulationActive,
    interPoints,
    setInterPoints,
    speed,
    setSpeed,
    trafficModel,
    setTrafficModel,
    distanceMetric,
    setDistanceMetric,
    mapKey,
    setMapKey,
    sidebarOpen,
    setSidebarOpen,
    showList,
    setShowList,
    showSettings,
    setShowSettings,
    mapCenter,
    randomRange,
    mapRef,
    semaphore,
  };

  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
};

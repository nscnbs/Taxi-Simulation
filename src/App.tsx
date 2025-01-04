import React, { useEffect } from "react";
import ListWindow from "./components/ControlPanel/ListWindow";
import SettingsWindow from "./components/ControlPanel/SettingsWindow";
import Sidebar from "./components/ControlPanel/Sidebar";
import MapComponent from "./components/MapComponent";
import "./App.css";
import { Status } from "./types/Simulation";
import { useSimulationManager } from "./core/SimulationManager";
import { useSimulation } from "./context/SimulationContext";
import { useSimulationControls } from "./core/SimulationControls";

function App() {
  const {
    taxis,
    clients,
    isSimulationActive,
    sidebarOpen,
    showList,
    setShowList,
    setShowSettings,
    mapKey,
    mapRef,
    mapCenter,
    taxiRoutes,
    setTaxiRoutes,
    taxiPolylines,
    setTaxiPolylines,
    showSettings,
    trafficModel,
    setTrafficModel,
    distanceMetric,
    setDistanceMetric,
  } = useSimulation();

  const { processClients } = useSimulationManager();

  const {
    handleAddTaxi,
    handleAddClient,
    handleStartSimulation,
    handleRestartSimulation,
    handlePauseSimulation,
    handleSpeedChange,
    handleSettings,
    toggleList,
    toggleSidebar,
  } = useSimulationControls();

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

  return (
    <div className={`App ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <MapComponent
        key={mapKey}
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
      <ListWindow
        show={showList}
        onClose={() => setShowList(false)}
        taxis={taxis}
        clients={clients}
      />
      <SettingsWindow
        show={showSettings}
        onClose={() => setShowSettings(false)}
        onSpeedChange={handleSpeedChange}
        trafficModel={trafficModel}
        onTrafficChange={setTrafficModel}
        distanceMetric={distanceMetric}
        onDistanceMetricChange={setDistanceMetric}
      />
      <div className={`control-panel ${sidebarOpen ? "" : "sidebar-closed"}`}>
        <Sidebar
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
        {sidebarOpen ? "⮜" : "⮞"}
      </button>
    </div>
  );
}

export default App;

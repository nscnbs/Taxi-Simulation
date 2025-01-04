import React, { useCallback } from 'react';
import { Taxi } from '../types/Taxi';
import { Client } from '../types/Client';
import { Status, LatLng } from '../types/Simulation';
import { generateInterpolatedRoute } from '../services/RouteService';
import { calculateRoute } from '../services/RouteService';
import { findClosestTaxi } from '../services/RouteService';
import { useGenerateRandomLocation } from '../utils/randomUtils';
import { useSimulation } from '../context/SimulationContext';


const generateUniqueAssignmentKey = (taxiId: number, clientId: number) => `${taxiId}-${clientId}`;


export const useSimulationManager = () => {
    const {
      taxis,
      setTaxis,
      clients,
      setClients,
      isSimulationActive,
      isProcessingClients,
      interPoints,
      trafficModel,
      distanceMetric,
      activeAssignments,
      setActiveAssignments,
      setIsProcessingClients,
      setTaxiRoutes,
      speed,
      mapRef,
      semaphore,
    } = useSimulation();

    
    const generateRandomLocation = useGenerateRandomLocation();

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
          if (!isSimulationActive) return;
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
    [interPoints, speed, isSimulationActive]);

    const assignTaxiToClient = useCallback(
        async (taxi: Taxi, client: Client) => {
        const assignmentKey = generateUniqueAssignmentKey(taxi.id, client.id);
        if (
          taxi.status !== Status.Available ||
          client.status !== Status.Available ||
          activeAssignments.has(assignmentKey) ||
          semaphore.has(taxi.id)
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
  
          const routeToClient = await calculateRoute(taxi.location, client.location, trafficModel);
          console.log(`Taxi ${taxi.id} starts moving to Client ${client.id}`);
    
          await new Promise<void>((resolve) =>
            moveTaxiAlongRoute(taxi, client, routeToClient, async () => {
              console.log(`Taxi ${taxi.id} finished moving to Client ${client.id}`);
              // Po dotarciu do klienta
              const destination = generateRandomLocation();
  
              if (mapRef.current) {
                const destinationMarker = mapRef.current.addDestinationMarker(
                  new google.maps.LatLng(destination.lat, destination.lng)
                );
    
              const routeToDestination = await calculateRoute(taxi.location, destination, trafficModel);
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
    [clients, taxis, moveTaxiAlongRoute, activeAssignments, trafficModel]);


    const processClients = useCallback(async () => {
        if (isProcessingClients) return; // Zapobiega wielokrotnemu uruchomieniu
  
        const availableClients = clients.filter((client) => client.status === Status.Available);
        const availableTaxis = taxis.filter((taxi) => taxi.status === Status.Available);
  
        if (availableClients.length === 0 || availableTaxis.length === 0) return;
  
        setIsProcessingClients(true);
        try {
            await Promise.all(
                  availableClients.map(async (client) => {
                  const closestTaxi = await findClosestTaxi(client.location, availableTaxis, trafficModel, distanceMetric);
                  if (closestTaxi) {
                      assignTaxiToClient(closestTaxi, client);
                  }
              })
          );
        } finally {
          setIsProcessingClients(false);
        }
    }, [clients, taxis, assignTaxiToClient, isProcessingClients, trafficModel, distanceMetric]);

  return { processClients, assignTaxiToClient, moveTaxiAlongRoute, updateStatus };
};
import { useSimulation } from "../context/SimulationContext";

export const useGenerateRandomLocation = () => {
  const { mapCenter, randomRange } = useSimulation();

  return () => ({
    lat: mapCenter.lat + (Math.random() - 0.5) * randomRange,
    lng: mapCenter.lng + (Math.random() - 0.5) * randomRange,
  });
};

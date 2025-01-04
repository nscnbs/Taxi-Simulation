import { LatLng, Status } from "./Simulation";

export type Taxi = {
  id: number;
  name: string;
  location: LatLng;
  status: Status;
  rides: number;
  currentStep?: number;
  isPaused?: boolean;
};

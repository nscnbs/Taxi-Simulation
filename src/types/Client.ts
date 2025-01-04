import { LatLng, Status } from "./Simulation";

export type Client = {
  id: number;
  name: string;
  location: LatLng;
  status: Status;
};

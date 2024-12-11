export enum Status {
  Available = 'available',
  Waiting = 'waiting',
  Busy = 'busy',
  Hibernate = 'hibernate'
}

export type LatLng = {
  lat: number;
  lng: number;
};

export type Taxi = {
  id: number;
  name: string;
  location: LatLng;
  status: Status;
  route: LatLng[];
  isLocked: boolean;
  rides: number;
};

export type Client = {
  id: number;
  name: string;
  location: LatLng;
  status: Status;
};

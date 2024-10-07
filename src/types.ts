export type LatLng = {
  lat: number;
  lng: number;
};

export type Taxi = {
  id: number;
  name: string;
  location: LatLng;
  available: boolean;
  waiting: boolean;
  busy: boolean;
  route?: LatLng[];
};

export type Client = {
  id: number;
  name: string;
  location: LatLng;
  available: boolean;
  waiting: boolean;
  busy: boolean;
};

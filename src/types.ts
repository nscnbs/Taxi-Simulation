export type Taxi = {
  id: number;
  name: string;
  location: { lat: number; lng: number };
  available: boolean;
  busy: boolean;
};

export type Client = {
  id: number;
  name: string;
  location: { lat: number; lng: number };
  waiting: boolean;
  busy: boolean;
};

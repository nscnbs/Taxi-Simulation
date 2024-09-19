import React, { useEffect, useRef } from 'react';
import { loadGoogleMapsAPI } from '../services/googleMapsAPI';
import { Taxi, Client } from '../types';

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  taxis: Taxi[];
  clients: Client[];
}

const Map: React.FC<MapProps> = ({ center, zoom, taxis, clients }) => {
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    let taxiMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    let clientMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    loadGoogleMapsAPI()
      .then(async () => {
        if (!mapRef.current) {
          // Importujemy potrzebne biblioteki
          const { Map } = await (window as any).google.maps.importLibrary('maps') as google.maps.MapsLibrary;

          // Tutaj dodajemy Map ID
          const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;

          mapRef.current = new Map(document.getElementById('map') as HTMLElement, {
            center,
            zoom,
            mapId, // Dodajemy mapId do konfiguracji mapy
          });
        }

        // Importujemy AdvancedMarkerElement
        const { AdvancedMarkerElement} = await (window as any).google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

        // Czyścimy poprzednie markery
        taxiMarkers.forEach(marker => marker.map = null);
        clientMarkers.forEach(marker => marker.map = null);
        taxiMarkers = [];
        clientMarkers = [];

        const parser = new DOMParser();

        const pinTaxiAvailableString = '<svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg"><path d="m12 13c0-.5523.4477-1 1-1h22c.5523 0 1 .4477 1 1v22c0 .5523-.4477 1-1 1h-22c-.5523 0-1-.4477-1-1z" fill="#47AE73"></path></svg>';
        const pinTaxiAvailable = parser.parseFromString(pinTaxiAvailableString, 'image/svg+xml').documentElement;
        const pinTaxiBusyString = '<svg fill="none" height="40" viewBox="0 0 48 48" width="40" xmlns="http://www.w3.org/2000/svg"><path d="m12 13c0-.5523.4477-1 1-1h22c.5523 0 1 .4477 1 1v22c0 .5523-.4477 1-1 1h-22c-.5523 0-1-.4477-1-1z" fill="#FB6964"></path></svg>';
        const pinTaxiBusy = parser.parseFromString(pinTaxiBusyString, 'image/svg+xml').documentElement;
        const pinTaxiWaitingString = '<svg fill="none" height="40" viewBox="0 0 48 48" width="40" xmlns="http://www.w3.org/2000/svg"><path d="m12 13c0-.5523.4477-1 1-1h22c.5523 0 1 .4477 1 1v22c0 .5523-.4477 1-1 1h-22c-.5523 0-1-.4477-1-1z" fill="rgba(255,235,59, 0.8)"></path></svg>';
        const pinTaxiWaiting = parser.parseFromString(pinTaxiWaitingString, 'image/svg+xml').documentElement;
        
        const pinClientAvailableString = '<svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg"><path d="m24 36c6.6274 0 12-5.3726 12-12 0-6.6275-5.3726-12-12-12s-12 5.3725-12 12c0 6.6274 5.3726 12 12 12z" fill="#47AE73" class=""></path></svg>';
        const pinClientAvailable = parser.parseFromString(pinClientAvailableString, 'image/svg+xml').documentElement;
        const pinClientBusyString = '<svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg"><path d="m24 36c6.6274 0 12-5.3726 12-12 0-6.6275-5.3726-12-12-12s-12 5.3725-12 12c0 6.6274 5.3726 12 12 12z" fill="#FB6964" class=""></path></svg>';
        const pinClientBusy = parser.parseFromString(pinClientBusyString, 'image/svg+xml').documentElement;
        const pinClientWaitingString = '<svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg"><path d="m24 36c6.6274 0 12-5.3726 12-12 0-6.6275-5.3726-12-12-12s-12 5.3725-12 12c0 6.6274 5.3726 12 12 12z" fill="rgba(255,235,59, 0.8)" class=""></path></svg>';
        const pinClientWaiting = parser.parseFromString(pinClientWaitingString, 'image/svg+xml').documentElement;
        
        pinTaxiAvailable.style.width = '40px';
        pinTaxiAvailable.style.height = '40px';

        pinClientWaiting.style.width = '40px';
        pinClientWaiting.style.height = '40px';

        // Funkcje do pobrania ikon
        const getTaxiIcon = (available: boolean, busy: boolean) => {
          if (available && !busy) return pinTaxiAvailable;
          if (!available && busy) return pinTaxiBusy;
          return pinTaxiWaiting;
        };

        const getClientIcon = (waiting: boolean, busy: boolean) => {
          if (waiting && !busy) return pinClientWaiting;
          if (!waiting && busy) return pinClientBusy;
          return pinClientAvailable;
        };

        // Dodajemy markery dla taksówek
        taxis.forEach(taxi => {
          const marker = new AdvancedMarkerElement({
            position: taxi.location,
            map: mapRef.current!,
            title: taxi.name,
            content: getTaxiIcon(taxi.available, taxi.busy),
          });

          taxiMarkers.push(marker);
        });
      

        // Dodajemy markery dla klientów
        clients.forEach(client => {
          const marker = new AdvancedMarkerElement({
            position: client.location,
            map: mapRef.current!,
            title: client.name,
            content: getClientIcon(client.waiting, client.busy),
          });
          clientMarkers.push(marker);
        });
      })
      .catch(error => {
        console.error('Google Maps API failed to load:', error);
      });

    // Funkcja czyszcząca markery po odmontowaniu komponentu
    return () => {
      taxiMarkers.forEach(marker => marker.map = null);
      clientMarkers.forEach(marker => marker.map = null);
    };
  }, [center, zoom, taxis, clients]);

  return <div id="map" style={{ height: '100vh', width: '100%' }} />;
};

export default Map;

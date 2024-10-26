import React, { useCallback, useState, useEffect, useRef } from 'react';
import { loadGoogleMapsAPI } from '../services/googleMapsAPI';
import { Taxi, Client } from '../types';

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  taxis: Taxi[];
  clients: Client[];
  isSimulationActive: boolean;
  speed: number; 
}

const Map: React.FC<MapProps> = ({ center, zoom, taxis, clients, isSimulationActive, speed }) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [taxiRoutes, setTaxiRoutes] = useState<google.maps.Polyline[]>([]);
  const [taxiMarkers, setTaxiMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [clientMarkers, setClientMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);


  useEffect(() => {
    let taxiMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    let clientMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    let taxiRoutes: google.maps.Polyline[] = [];

    loadGoogleMapsAPI()
      .then(async () => {
        if (!window.google) {
          console.error("Google Maps API not loaded");
          return;
        }

        if (!mapRef.current) {

          const { Map } = await (window as any).google.maps.importLibrary('maps') as google.maps.MapsLibrary;
          const mapId = process.env.REACT_APP_GOOGLE_MAPS_MAP_ID;

          mapRef.current = new Map(document.getElementById('map') as HTMLElement, {
            center,
            zoom,
            mapId,
          });
        }

        const { AdvancedMarkerElement, PinElement } = await (window as any).google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
        const DirectionsService = (window as any).google.maps.DirectionsService;
        const DirectionsRenderer = (window as any).google.maps.DirectionsRenderer;

        const service = new DirectionsService();
        const renderer = new DirectionsRenderer();
        renderer.setMap(mapRef.current);
        setDirectionsService(service);
        setDirectionsRenderer(renderer);

        taxiMarkers.forEach(marker => marker.map = null);
        clientMarkers.forEach(marker => marker.map = null);
        taxiRoutes.forEach(route => route.setMap(null));
        setTaxiMarkers([]);
        setTaxiRoutes([]);

        // Taxi Markers
        taxis.forEach(taxi => {
          const icon = document.createElement('div');
          icon.innerHTML = '<i class="fa fa-taxi" style="color: #FFFFFF;"></i>';
          let backgroundColor = '';
          if (taxi.available) {
            backgroundColor = '#47AE73'; // Available
          } else if (taxi.busy) {
            backgroundColor = '#FB6964'; // Busy
          } else {
            backgroundColor = '#FFD514'; // Waiting
          }

          const faPin = new PinElement({
            glyph: icon,
            glyphColor: '#FFFFFF',
            background: backgroundColor,
            borderColor: '#000000',
          });

          const marker = new AdvancedMarkerElement({
            position: taxi.location,
            map: mapRef.current!,
            title: taxi.name,
            content: faPin.element,
          });
          setTaxiMarkers(prevMarkers => [...prevMarkers, marker]);

          // Rysowanie trasy, jeśli taksówka ma trasę
          if (taxi.route && taxi.route.length > 0) {
            const routePath = new google.maps.Polyline({
              path: taxi.route.map(point => ({ lat: point.lat, lng: point.lng })),
              geodesic: true,
              strokeColor: '#FF0000',
              strokeOpacity: 1.0,
              strokeWeight: 2,
            });
            routePath.setMap(mapRef.current);
            setTaxiRoutes(prevRoutes => [...prevRoutes, routePath]);
          }
        });

        // Client Markers
        clients.forEach(client => {
          const icon = document.createElement('div');
          icon.innerHTML = '<i class="fa fa-user" style="color: #FFFFFF;"></i>';
          let backgroundColor = '';
          if (client.available) {
            backgroundColor = '#47AE73'; // Available
          } else if (client.busy) {
            backgroundColor = '#FB6964'; // Busy
          } else {
            backgroundColor = '#FFD514'; // Waiting
          }

          const faPin = new PinElement({
            glyph: icon,
            glyphColor: '#FFFFFF',
            background: backgroundColor,
            borderColor: '#000000',
          });

          const marker = new AdvancedMarkerElement({
            position: client.location,
            map: mapRef.current!,
            title: client.name,
            content: faPin.element,
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
      taxiRoutes.forEach(route => route.setMap(null));
    };
  }, [center, zoom, taxis, clients]);


  const interpolatePoints = (start: google.maps.LatLng, end: google.maps.LatLng, numPoints: number): google.maps.LatLng[] => {
    const interpolatedPoints: google.maps.LatLng[] = [];
    const latStep = (end.lat() - start.lat()) / numPoints;
    const lngStep = (end.lng() - start.lng()) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
      const lat = start.lat() + latStep * i;
      const lng = start.lng() + lngStep * i;
      interpolatedPoints.push(new google.maps.LatLng(lat, lng));
    }

    return interpolatedPoints;
  };

  const moveTaxiAlongRoute = useCallback((taxiIndex: number, route: google.maps.DirectionsRoute) => {
    if (!taxiMarkers[taxiIndex]) return;

    let step = 0;
    const steps = route.legs[0].steps;
    const interpolatedRoute: google.maps.LatLng[] = [];

    steps.forEach((step) => {
      const points = interpolatePoints(step.start_location, step.end_location, 100); // Dodajemy 100 punktów między każdym krokiem
      interpolatedRoute.push(...points);
    });

    const routePath = new google.maps.Polyline({
      path: interpolatedRoute,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2,
    });

    routePath.setMap(mapRef.current);
    setTaxiRoutes(prevRoutes => [...prevRoutes, routePath]);

    const moveInterval = setInterval(() => {
      if (step >= interpolatedRoute.length) {
        clearInterval(moveInterval);
        routePath.setMap(null);
        return;
      }

      const newPosition = interpolatedRoute[step];
      taxiMarkers[taxiIndex].position = newPosition;

      routePath.setPath(interpolatedRoute.slice(step));

      step++;
    }, speed / 50); // Podzielona prędkość dla płynniejszego ruchu
  }, [taxiMarkers, speed]);

  const calculateRoute = useCallback((taxiIndex: number, clientLocation: google.maps.LatLng) => {
    if (!directionsService || !taxiMarkers[taxiIndex]) return;

    const request: google.maps.DirectionsRequest = {
      origin: taxiMarkers[taxiIndex].position as google.maps.LatLng,
      destination: clientLocation,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result) {
        moveTaxiAlongRoute(taxiIndex, result.routes[0]);
      } else {
        console.error('Could not calculate route:', status);
      }
    });
  }, [directionsService, taxiMarkers, moveTaxiAlongRoute]);

  useEffect(() => {
    if (isSimulationActive && taxis.length > 0 && clients.length > 0) {
      taxis.forEach((taxi, taxiIndex) => {
        const client = clients.find(client => client.waiting && !client.busy);
        if (client) {
          const clientPosition = new google.maps.LatLng(client.location.lat, client.location.lng);
          calculateRoute(taxiIndex, clientPosition);
        }
      });
    }
  }, [taxis, clients, isSimulationActive, calculateRoute]);

  return <div id="map" style={{ height: '100vh', width: '100%' }} />;
};

export default Map;
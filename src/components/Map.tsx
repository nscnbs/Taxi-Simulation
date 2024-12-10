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
  onRouteDrawn?: (route: google.maps.DirectionsRoute) => void;
  route?: google.maps.DirectionsRoute | null;
  interpolatedRoute: google.maps.LatLng[]; 
  clearRouteSegment: (segmentIndex: number) => void;
}

const Map: React.FC<MapProps> = ({ center, zoom, taxis, clients, isSimulationActive, speed, onRouteDrawn, route, interpolatedRoute, clearRouteSegment}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const taxiMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clientMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [currentPolyline, setCurrentPolyline] = useState<google.maps.Polyline | null>(null);


  const clearRoutes = useCallback(() => {
    if (currentPolyline) {
        currentPolyline.setMap(null);
        setCurrentPolyline(null);
    }
}, [currentPolyline]);

const handleClearRouteSegment = useCallback((segmentIndex: number) => {
    if (segmentIndex < 0 || segmentIndex >= interpolatedRoute.length - 1 || !currentPolyline) return;

    const remainingPath = interpolatedRoute.slice(segmentIndex);
    currentPolyline?.setPath(remainingPath);
}, [interpolatedRoute, currentPolyline]);

  

  const updateMarkers = useCallback(() => {
    const { AdvancedMarkerElement, PinElement } = (window as any).google.maps.marker;
  
    taxis.forEach((taxi, index) => {
      let marker = taxiMarkersRef.current[index];
      const backgroundColor = taxi.available ? '#47AE73' : taxi.busy ? '#FB6964' : '#FFD514';
  
      if (marker) {
        marker.position = taxi.location;
        const icon = document.createElement('div');
        icon.innerHTML = '<i class="fa fa-taxi" style="color: #FFFFFF;"></i>';
        const faPin = new PinElement({
          glyph: icon,
          glyphColor: '#FFFFFF',
          background: backgroundColor,
          borderColor: '#000000',
        });
  
        marker.content = faPin.element;
  
      } else {
        // Tworzymy nowy marker, jeśli nie istnieje
        const icon = document.createElement('div');
        icon.innerHTML = '<i class="fa fa-taxi" style="color: #FFFFFF;"></i>';
        const faPin = new PinElement({
          glyph: icon,
          glyphColor: '#FFFFFF',
          background: backgroundColor,
          borderColor: '#000000',
        });
  
        marker = new AdvancedMarkerElement({
          position: taxi.location,
          map: mapRef.current!,
          title: taxi.name,
          content: faPin.element,
        });
        taxiMarkersRef.current.push(marker);
      }
    });
  
    // Aktualizacja lub tworzenie markerów klientów
    clients.forEach((client, index) => {
      let marker = clientMarkersRef.current[index];
      const backgroundColor = client.available ? '#47AE73' : client.busy ? '#FB6964' : '#FFD514';
  
      if (marker) {
        marker.position = client.location;
  
        const icon = document.createElement('div');
        icon.innerHTML = '<i class="fa fa-user" style="color: #FFFFFF;"></i>';
        const faPin = new PinElement({
          glyph: icon,
          glyphColor: '#FFFFFF',
          background: backgroundColor,
          borderColor: '#000000',
        });
  
        marker.content = faPin.element;
      } else {
        const icon = document.createElement('div');
        icon.innerHTML = '<i class="fa fa-user" style="color: #FFFFFF;"></i>';
        const faPin = new PinElement({
          glyph: icon,
          glyphColor: '#FFFFFF',
          background: backgroundColor,
          borderColor: '#000000',
        });
  
        marker = new AdvancedMarkerElement({
          position: client.location,
          map: mapRef.current!,
          title: client.name,
          content: faPin.element,
        });
        clientMarkersRef.current.push(marker);
      }
    });
  }, [taxis, clients]);
  

  const drawRoute = useCallback(() => {
    if (!interpolatedRoute || interpolatedRoute.length === 0) return;

    clearRoutes(); // Очистка предыдущих маршрутов, если нужно

    const routePath = new google.maps.Polyline({
        path: interpolatedRoute,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
    });

    routePath.setMap(mapRef.current!);
    setCurrentPolyline(routePath); // Обновляем текущее значение полилинии
}, [interpolatedRoute, clearRoutes]);


  useEffect(() => {
    const initializeMap = async () => {
      try {
        await loadGoogleMapsAPI();
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

        updateMarkers();

      } catch (error) {
        console.error('Google Maps API failed to load:', error);
      }
    };

    initializeMap();
  }, [center, zoom, updateMarkers]);

  useEffect(() => {
    if (route) {
        drawRoute();
    }
  }, [route, drawRoute]);

  return <div id="map" style={{ height: '100vh', width: '100%' }} />;
};

export default Map;

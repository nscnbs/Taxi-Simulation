import React, { useCallback, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { loadGoogleMapsAPI } from '../services/googleMapsAPI';
import { Taxi, Client, Status } from '../types';

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  taxis: Taxi[];
  clients: Client[];
  isSimulationActive: boolean;
  speed: number;
  route?: google.maps.DirectionsRoute | null;
  interpolatedRoute: google.maps.LatLng[]; 
}


export interface MapHandle {
  addDestinationMarker: (position: google.maps.LatLng ) => google.maps.marker.AdvancedMarkerElement;
  removeDestinationMarker: (marker: google.maps.marker.AdvancedMarkerElement) => void;
  drawRoute: (route: google.maps.LatLng[]) => void; // Funkcja rysująca trasę
  handleClearRouteSegment: (segmentIndex: number) => void; // Funkcja czyszcząca segment trasy
}


const Map = forwardRef<MapHandle, MapProps>(({
  center,
  zoom,
  taxis,
  clients,
  isSimulationActive,
  speed,
  route,
  interpolatedRoute
}, ref) => {

  const mapRef = useRef<google.maps.Map | null>(null);
  const taxiMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clientMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const destinationMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]); 
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
      const backgroundColor =
      taxi.status === Status.Available ? '#47AE73' :
      taxi.status === Status.Busy ? '#FB6964' :
      '#FFD514';
  
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
      const backgroundColor =
      client.status === Status.Available ? '#47AE73' :
      client.status === Status.Busy ? '#FB6964' :
      client.status === Status.Hibernate ? '#B0B0B0' :
      '#FFD514';
  
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

  const addDestinationMarker = useCallback((position: google.maps.LatLng ) => {
    const beachFlagImg = document.createElement('img');
    beachFlagImg.src = 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current!,
      position,
      content: beachFlagImg,
      title: "Destination",
    });
  
    destinationMarkersRef.current.push(marker); // Dodajemy marker do referencji
    return marker;
  }, []);
  
  const removeDestinationMarker = useCallback((marker: google.maps.marker.AdvancedMarkerElement) => {
    marker.map = null; // Usuwamy marker z mapy
    destinationMarkersRef.current = destinationMarkersRef.current.filter((m) => m !== marker); // Usuwamy z referencji
  }, []);
  
  useImperativeHandle(ref, () => ({
    addDestinationMarker,
    removeDestinationMarker,
    drawRoute,
    handleClearRouteSegment,
  }));

const drawRoute = useCallback((route: google.maps.LatLng[]) => {
  if (!route || route.length === 0) return;

  clearRoutes(); // Czyści poprzednie trasy, jeśli istnieją

  const routePath = new google.maps.Polyline({
    path: route,
    geodesic: true,
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 2,
  });

  routePath.setMap(mapRef.current!);
  setCurrentPolyline(routePath); // Ustawiamy nową trasę
}, [clearRoutes]);


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

  return <div id="map" style={{ height: '100vh', width: '100%' }} />;
});

export default Map;

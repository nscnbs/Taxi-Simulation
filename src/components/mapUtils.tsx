import React, { useCallback, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { loadGoogleMapsAPI } from '../services/googleMapsAPI';
import { Taxi, Client, Status } from '../types';

interface MapProps {
  center: { lat: number; lng: number };
  zoom: number;
  taxis: Taxi[];
  clients: Client[];
  taxiRoutes: Map<number, google.maps.LatLng[]>;
  setTaxiRoutes: React.Dispatch<React.SetStateAction<Map<number, google.maps.LatLng[]>>>;
  taxiPolylines: Map<number, google.maps.Polyline>;
  setTaxiPolylines: React.Dispatch<React.SetStateAction<Map<number, google.maps.Polyline>>>;
}


export interface MapHandle {
  addDestinationMarker: (position: google.maps.LatLng ) => google.maps.marker.AdvancedMarkerElement;
  removeDestinationMarker: (marker: google.maps.marker.AdvancedMarkerElement) => void;
  drawRoute: (taxiId: number, route: google.maps.LatLng[]) => void;
  clearRouteSegment: (taxiId: number, segmentIndex: number) => void;
  clearRoute: (taxiId: number) => void;
}


const mapUtils = forwardRef<MapHandle, MapProps>(({
  center,
  zoom,
  taxis,
  clients,
  taxiRoutes,
  taxiPolylines,
  setTaxiRoutes,
  setTaxiPolylines,
}, ref) => {

  const mapRef = useRef<google.maps.Map | null>(null);
  const taxiMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clientMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const destinationMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

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
  
    destinationMarkersRef.current.push(marker);
    return marker;
  }, []);
  
  const removeDestinationMarker = useCallback((marker: google.maps.marker.AdvancedMarkerElement) => {
    marker.map = null;
    destinationMarkersRef.current = destinationMarkersRef.current.filter((m) => m !== marker);
  }, []);

  const removeClientMarker = useCallback((marker: google.maps.marker.AdvancedMarkerElement) => {
    marker.map = null; // Usuń marker z mapy
    clientMarkersRef.current = clientMarkersRef.current.filter((m) => m !== marker); // Usuń z referencji
  }, []);

  const clearRouteSegment = useCallback(
    (taxiId: number, segmentIndex: number) => {
      const route = taxiRoutes.get(taxiId);
      const polyline = taxiPolylines.get(taxiId);
  
      if (!route || !polyline || segmentIndex < 0 || segmentIndex >= route.length - 1) return;
  
      const remainingPath = route.slice(segmentIndex);
      polyline.setPath(remainingPath);
    },
    [taxiRoutes, taxiPolylines]
  );
 
  const clearRoute = useCallback((taxiId: number) => {
    setTaxiPolylines((prevPolylines) => {
      const updatedPolylines = new Map(prevPolylines);
      const polyline = updatedPolylines.get(taxiId);

      if (polyline) {
        polyline.setMap(null);
        updatedPolylines.delete(taxiId);
      }

      return updatedPolylines;
    });

    setTaxiRoutes((prevRoutes) => {
      const updatedRoutes = new Map(prevRoutes);
      updatedRoutes.delete(taxiId);
      return updatedRoutes;
    });
  }, [setTaxiPolylines, setTaxiRoutes]);
  
  const drawRoute = useCallback(
    (taxiId: number, route: google.maps.LatLng[]) => {
      if (!route || route.length === 0) return;
  
      const routePath = new google.maps.Polyline({
        path: route,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
      });
  
      routePath.setMap(mapRef.current!);
  
      setTaxiPolylines((prev) => new Map(prev).set(taxiId, routePath));
    },
    []
  );

    
  useImperativeHandle(ref, () => ({
    addDestinationMarker,
    removeDestinationMarker,
    drawRoute,
    clearRouteSegment,
    clearRoute,
  }));


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

export default mapUtils;

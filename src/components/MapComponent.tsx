import React, { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { loadGoogleMapsAPI } from '../services/GoogleMapsService';
import { Taxi } from '../types/Taxi';
import { Client } from '../types/Client';
import { Status } from '../types/Simulation';

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
  removeClientMarker: (clientId: number) => void;
  clearAllRoutes: () => void;
  resetMap: () => void;
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
  const taxiMarkersMap = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const clientMarkersMap = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const destinationMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const updateTaxiMarkers = useCallback(() => {
    const { AdvancedMarkerElement, PinElement } = (window as any).google.maps.marker;
    taxis.forEach((taxi) => {
      let marker = taxiMarkersMap.current.get(taxi.id);
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
  
        const newMarker = new AdvancedMarkerElement({
          position: taxi.location,
          map: mapRef.current!,
          title: taxi.name,
          content: faPin.element,
        });
        taxiMarkersMap.current.set(taxi.id, newMarker);
      }
    });
  }, [taxis]);   

  const updateClientMarkers = useCallback(() => {
    const { AdvancedMarkerElement, PinElement } = (window as any).google.maps.marker;
    clients.forEach((client) => {
      let marker = clientMarkersMap.current.get(client.id);
      const backgroundColor =
      client.status === Status.Available ? '#47AE73' :
      client.status === Status.Busy ? '#FB6964' :
      client.status === Status.Hibernate ? '#B0B0B0' :
      '#FFD514';

      if (client.status === Status.Finished) {
        if (marker) {
          removeClientMarker(client.id);
        }
        return;
      }
  
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
  
        const newMarker = new AdvancedMarkerElement({
          position: client.location,
          map: mapRef.current!,
          title: client.name,
          content: faPin.element,
        });
        clientMarkersMap.current.set(client.id, newMarker);
      }
      
    });
  }, [clients]);

  const updateMarkers = useCallback(() => { 
    updateTaxiMarkers();
    updateClientMarkers();
  }, [updateTaxiMarkers, updateClientMarkers]);
    

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

  const removeClientMarker = useCallback((clientId: number) => {
    const marker = clientMarkersMap.current.get(clientId);
    if (marker) {
      marker.map = null;
      clientMarkersMap.current.delete(clientId);
    }
  }, []);

  const clearAllDestinationMarkers = useCallback(() => {
    destinationMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    destinationMarkersRef.current = [];
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

  const clearAllRoutes = () => {
    taxiPolylines.forEach((polyline) => polyline.setMap(null));
    setTaxiPolylines(new Map());
  };

  const resetMap = () => {
    mapRef.current?.setCenter(center);
    setTaxiRoutes(new Map());
    setTaxiPolylines(new Map());
    clearAllRoutes();
    clearAllDestinationMarkers();
  };

  
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
    [setTaxiPolylines]
  );

  useImperativeHandle(ref, () => ({
    addDestinationMarker,
    removeDestinationMarker,
    drawRoute,
    clearRouteSegment,
    clearRoute,
    clearAllRoutes,
    removeClientMarker,
    resetMap,
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

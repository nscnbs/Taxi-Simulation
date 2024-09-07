import React, { useEffect } from 'react';

interface MapProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}

const Map: React.FC<MapProps> = ({ center, zoom }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const map = new window.google.maps.Map(document.getElementById('map') as HTMLElement, {
        center,
        zoom,
      });
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [center, zoom]);

  return <div id="map" style={{ width: '100%', height: '100vh' }} />;
};

export default Map;

import { Taxi, Client, LatLng, Status } from '../types';

const getDistance = async (origin: LatLng, destination: LatLng) => {
  const directionsService = new google.maps.DirectionsService();
  const request: google.maps.DirectionsRequest = {
    origin: new google.maps.LatLng(origin.lat, origin.lng),
    destination: new google.maps.LatLng(destination.lat, destination.lng),
    travelMode: google.maps.TravelMode.DRIVING,
    drivingOptions: {
      departureTime: new Date(),
      trafficModel: google.maps.TrafficModel.PESSIMISTIC
    }
  };

  return new Promise<number>((resolve, reject) => {
    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result && result.routes.length > 0) {
        const route = result.routes[0];
        const distance = route.legs[0].distance?.value || 0;
        resolve(distance);
      } else {
        reject('Unable to calculate route');
      }
    });
  });
};

export const findClosestTaxi = async (clientLocation: LatLng, taxis: Taxi[]): Promise<Taxi | null> => {
  const availableTaxis = taxis.filter(taxi => taxi.status === Status.Available && !taxi.isLocked);
  if (availableTaxis.length === 0) return null;
  
  const distances = await Promise.all(
    availableTaxis.map(async taxi => ({
      taxi,
      distance: await getDistance(clientLocation, taxi.location),
    }))
  );
  
  return distances.sort((a, b) => a.distance - b.distance)[0]?.taxi || null;
};
  
export const calculateRoute = async (taxi: Taxi, client: Client): Promise<google.maps.DirectionsRoute> => {
  const directionsService = new google.maps.DirectionsService();
  const request: google.maps.DirectionsRequest = {
    origin: new google.maps.LatLng(taxi.location.lat, taxi.location.lng),
    destination: new google.maps.LatLng(client.location.lat, client.location.lng),
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: true,
  };

  return new Promise((resolve, reject) => {
    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result) {
        console.log(result); // dodaj to
        resolve(result.routes[0]);
      } else {
        reject('Could not calculate route');
      }
    });
  });
};

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

export const generateInterpolatedRoute = (route: google.maps.DirectionsRoute, numPoints: number) => {
  return route.legs[0].steps.flatMap((step) =>
    interpolatePoints(step.start_location, step.end_location, numPoints)
  );
};

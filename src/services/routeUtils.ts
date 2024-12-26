import { Taxi, Client, LatLng, Status } from '../types';

const routeCache = new Map<string, google.maps.LatLng[]>();

export const calculateRoute = async (origin: LatLng, destination: LatLng) => {
  const directionsService = new google.maps.DirectionsService();
  const request: google.maps.DirectionsRequest = {
    origin: new google.maps.LatLng(origin.lat, origin.lng),
    destination: new google.maps.LatLng(destination.lat, destination.lng),
    travelMode: google.maps.TravelMode.DRIVING,
    provideRouteAlternatives: true,
    drivingOptions: {
      departureTime: new Date(),
      trafficModel: google.maps.TrafficModel.PESSIMISTIC
    }
  };

  return new Promise<google.maps.DirectionsRoute>((resolve, reject) => {
    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result && result.routes.length > 0) {
        resolve(result.routes[0]); // Zwracaj główną trasę
      } else {
        reject(new Error(`Failed to calculate route: ${status}`));
      }
    });
  });
};


export const findClosestTaxi = async (
  clientLocation: LatLng,
  taxis: Taxi[],
): Promise<Taxi | null> => {
  const travelTimes = await Promise.all(
    taxis.map(async (taxi) => ({
      taxi,
      travelTime: await calculateTravelTime(clientLocation, taxi.location),
    }))
  );

  return travelTimes.sort((a, b) => a.travelTime - b.travelTime)[0]?.taxi || null;
};


export async function calculateTravelTime(pointA: LatLng, pointB: LatLng): Promise<number> {
  const service = new google.maps.DistanceMatrixService();
  return new Promise((resolve, reject) => {
    service.getDistanceMatrix(
      {
        origins: [new google.maps.LatLng(pointA.lat, pointA.lng)],
        destinations: [new google.maps.LatLng(pointB.lat, pointB.lng)],
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.PESSIMISTIC
        }
      },
      (response, status) => {
        if (status === google.maps.DistanceMatrixStatus.OK && response) {
          const element = response.rows[0]?.elements[0];
          if (element && element.duration) {
            const travelTime = element.duration.value; // Czas przejazdu w sekundach
            resolve(travelTime);
          } else {
            reject('Unable to retrieve travel time from response');
          }
        } else {
          reject(`Error calculating travel time: ${status}`);
        }
      }
    );
  });
}



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

export const generateInterpolatedRoute = (
  route: google.maps.DirectionsRoute,
  numPoints: number
): google.maps.LatLng[] => {
  const routeKey = JSON.stringify(route);
  if (routeCache.has(routeKey)) {
    return routeCache.get(routeKey)!;
  }

  const interpolatedRoute = route.legs[0].steps.flatMap((step) =>
    interpolatePoints(step.start_location, step.end_location, numPoints)
  );

  routeCache.set(routeKey, interpolatedRoute);
  return interpolatedRoute;
};
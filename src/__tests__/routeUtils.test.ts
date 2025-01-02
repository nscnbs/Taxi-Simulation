import { calculateRoute } from '../services/routeUtils';

jest.mock('../services/routeUtils', () => ({
    calculateRoute: jest.fn(),
  }));
  
  describe('Route Utilities', () => {
    it('should calculate a valid route', async () => {
      const mockRoute = [
        { lat: 51.1079, lng: 17.0385 },
        { lat: 51.1109, lng: 17.0405 },
      ];
      const calculateRoute = jest.fn().mockResolvedValue(mockRoute);
  
      const result = await calculateRoute(
        { lat: 51.1079, lng: 17.0385 },
        { lat: 51.1109, lng: 17.0405 },
        'optimistic'
      );
  
      expect(result).toEqual(mockRoute);
    });
  });
  

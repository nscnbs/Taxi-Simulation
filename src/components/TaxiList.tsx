import React from 'react';
import { Taxi, Client, LatLng, Status } from '../types';

interface TaxiListProps {
  taxis: Taxi[];
}

function TaxiList({ taxis }: TaxiListProps) {
  if (!taxis || taxis.length === 0) {
    return <div>No taxis available</div>;
  }

  return (
    <div>
      <ul>
        {taxis.map(taxi => (
          <li key={taxi.id}>
            {taxi.name} - ID: {taxi.id} - { Status.Available ? 'Available' : Status.Busy ? 'Unavailable' : 'Hibernate'} - Rides: {taxi.rides} 
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaxiList;

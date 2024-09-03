import React from 'react';

interface Taxi {
  id: number;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  available: boolean;
}

interface TaxiListProps {
  taxis: Taxi[];
}

function TaxiList({ taxis }: TaxiListProps) {
  if (!taxis || taxis.length === 0) {
    return <div>No taxis available</div>;
  }

  return (
    <div>
      <h2>Taxi List</h2>
      <ul>
        {taxis.map(taxi => (
          <li key={taxi.id}>
            {taxi.name} - {taxi.available ? 'Available' : 'Unavailable'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaxiList;

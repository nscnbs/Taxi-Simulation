import React from 'react';
import { Taxi, Client, LatLng, Status } from '../types';

interface ClientListProps {
  clients: Client[];
}

function ClientList({ clients }: ClientListProps) {
  if (!clients || clients.length === 0) {
    return <div>No clients available</div>;
  }

  return (
    <div>
      <ul>
        {clients.map(client => (
          <li key={client.id}>
            {client.name} - { Status.Available ? 'Available' : Status.Busy ? 'Unavailable' : 'Hibernate'} 
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ClientList;

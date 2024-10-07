import React from 'react';

interface Client {
  id: number;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
}

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
            {client.name} - Location: ({client.location.lat}, {client.location.lng})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ClientList;

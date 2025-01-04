import { Client } from "../../types/Client";

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
        {clients.map((client) => (
          <li key={client.id}>
            {client.name} - ID: {client.id} - Status: {client.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ClientList;

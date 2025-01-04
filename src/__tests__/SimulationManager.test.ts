import { Taxi } from "../types/Taxi";
import { Client } from "../types/Client";
import { Status } from "../types/Simulation";
import { useSimulationManager } from "../core/SimulationManager";

describe("updateStatus function", () => {
  it("should update the status of an entity correctly", () => {
    const { updateStatus } = useSimulationManager();
    const mockTaxis: Taxi[] = [
      {
        id: 1,
        name: "Taxi 1",
        location: { lat: 51.1, lng: 17.0 },
        status: Status.Available,
        rides: 0,
      },
    ];

    const setTaxis = jest.fn();

    updateStatus<Taxi>(mockTaxis, setTaxis, 1, Status.Busy);

    expect(setTaxis).toHaveBeenCalledWith([
      {
        id: 1,
        name: "Taxi 1",
        location: { lat: 51.1, lng: 17.0 },
        status: Status.Busy,
        rides: 0,
      },
    ]);
  });
});

describe("assignTaxiToClient function", () => {
  it("should assign the closest taxi to a client", async () => {
    const { assignTaxiToClient } = useSimulationManager();
    const mockTaxi: Taxi = {
      id: 1,
      name: "Taxi 1",
      location: { lat: 51.1, lng: 17.0 },
      status: Status.Available,
      rides: 0,
    };
    const mockClient: Client = {
      id: 1,
      name: "Client 1",
      location: { lat: 51.11, lng: 17.01 },
      status: Status.Available,
    };

    const mockSetTaxis = jest.fn();
    const mockSetClients = jest.fn();

    await assignTaxiToClient(mockTaxi, mockClient);

    expect(mockSetTaxis).toHaveBeenCalled();
    expect(mockSetClients).toHaveBeenCalled();
  });
});

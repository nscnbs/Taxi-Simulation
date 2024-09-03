package main

import (
	"encoding/json"
	"net/http"
	"sync"
)

type Taxi struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Location  LatLng `json:"location"`
	Available bool   `json:"available"`
}

type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type Client struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Location LatLng `json:"location"`
}

var (
	taxis   []Taxi
	clients []Client
	mutex   sync.Mutex
)

func main() {
	http.HandleFunc("/api/simulation/start", startSimulationHandler)
	http.HandleFunc("/api/simulation/restart", restartSimulationHandler) // Dodano endpoint do restartu
	http.HandleFunc("/api/taxis", taxisHandler)
	http.HandleFunc("/api/clients", clientsHandler)
	http.HandleFunc("/api/settings", settingsHandler) // Dodano endpoint do ustawień
	http.ListenAndServe(":8080", nil)
}

func startSimulationHandler(w http.ResponseWriter, r *http.Request) {
	// Logika symulacji
	mutex.Lock()
	defer mutex.Unlock()

	for i := range taxis {
		// Symulacja przemieszczania taksówek do najbliższego klienta
		closestClient := findClosestClient(taxis[i].Location)
		if closestClient != nil {
			taxis[i].Location = closestClient.Location
			taxis[i].Available = false
		}
	}

	json.NewEncoder(w).Encode(taxis)
}

func restartSimulationHandler(w http.ResponseWriter, r *http.Request) {
	// Restart symulacji
	mutex.Lock()
	defer mutex.Unlock()

	// Przywrócenie taksówek i klientów do stanu początkowego
	taxis = nil
	clients = nil

	// Można dodać dodatkową logikę restartowania, np. ponowne inicjalizowanie danych

	json.NewEncoder(w).Encode(map[string]string{"status": "Simulation restarted"})
}

func settingsHandler(w http.ResponseWriter, r *http.Request) {
	// Logika ustawień
	if r.Method == http.MethodPost {
		// Możliwość aktualizacji ustawień
		var settings map[string]interface{}
		json.NewDecoder(r.Body).Decode(&settings)
		// Przykładowa logika dla ustawień
		// np. Zmiana parametrów symulacji na podstawie settings
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(settings)
	} else if r.Method == http.MethodGet {
		// Przykładowe ustawienia
		settings := map[string]interface{}{
			"simulationSpeed": 1.0,
			"maxTaxis":        10,
		}
		json.NewEncoder(w).Encode(settings)
	}
}

func findClosestClient(taxiLocation LatLng) *Client {
	var closestClient *Client
	minDistance := 999999999.0
	for i, client := range clients {
		distance := getDistance(taxiLocation, client.Location)
		if distance < minDistance {
			closestClient = &clients[i]
			minDistance = distance
		}
	}
	return closestClient
}

func getDistance(loc1, loc2 LatLng) float64 {
	// Funkcja licząca odległość pomiędzy dwoma punktami
	return 0 // obliczenia odległości
}

func taxisHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	if taxis == nil {
		taxis = []Taxi{}
	}

	if r.Method == http.MethodGet {
		json.NewEncoder(w).Encode(taxis)
	} else if r.Method == http.MethodPost {
		var newTaxi Taxi
		json.NewDecoder(r.Body).Decode(&newTaxi)
		taxis = append(taxis, newTaxi)
		w.WriteHeader(http.StatusCreated)
	}
}

func clientsHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	if clients == nil {
		clients = []Client{}
	}

	if r.Method == http.MethodGet {
		json.NewEncoder(w).Encode(clients)
	} else if r.Method == http.MethodPost {
		var newClient Client
		json.NewDecoder(r.Body).Decode(&newClient)
		clients = append(clients, newClient)
		w.WriteHeader(http.StatusCreated)
	}
}

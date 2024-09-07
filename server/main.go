package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
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
	Waiting  bool   `json:"waiting"`
}

var (
	taxis       []Taxi
	clients     []Client
	mutex       sync.Mutex
	simulation  bool
	ticker      *time.Ticker
	stopChannel chan bool
)

func main() {
	http.HandleFunc("/api/simulation/start", startSimulationHandler)
	http.HandleFunc("/api/simulation/stop", stopSimulationHandler)
	http.HandleFunc("/api/simulation/restart", restartSimulationHandler)
	http.HandleFunc("/api/taxis", taxisHandler)
	http.HandleFunc("/api/clients", clientsHandler)
	http.HandleFunc("/api/settings", settingsHandler)
	http.ListenAndServe(":8080", nil)
}

func startSimulationHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	if simulation {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Simulation is already running"})
		return
	}

	simulation = true
	stopChannel = make(chan bool)
	ticker = time.NewTicker(2 * time.Second)

	go runSimulation()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Simulation started"})
}

func runSimulation() {
	for {
		select {
		case <-stopChannel:
			return
		case <-ticker.C:
			mutex.Lock()
			for i := range taxis {
				if taxis[i].Available {
					closestClient := findClosestClient(taxis[i].Location)
					if closestClient != nil {
						taxis[i].Location = closestClient.Location
						taxis[i].Available = false
						closestClient.Waiting = false
					}
				}
			}
			mutex.Unlock()
		}
	}
}

func stopSimulationHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	if !simulation {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Simulation is not running"})
		return
	}

	simulation = false
	ticker.Stop()
	close(stopChannel)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Simulation stopped"})
}

func restartSimulationHandler(w http.ResponseWriter, r *http.Request) {
	stopSimulationHandler(w, r)

	mutex.Lock()
	defer mutex.Unlock()

	taxis = nil
	clients = nil

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "Simulation restarted"})
}

func settingsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var settings map[string]interface{}
		json.NewDecoder(r.Body).Decode(&settings)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(settings)
	} else if r.Method == http.MethodGet {
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
		if distance < minDistance && client.Waiting {
			closestClient = &clients[i]
			minDistance = distance
		}
	}
	return closestClient
}

func getDistance(loc1, loc2 LatLng) float64 {
	// To do: obliczenia odległości
	return 0 // tymczasowy placeholder
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
		newClient.Waiting = true
		clients = append(clients, newClient)
		w.WriteHeader(http.StatusCreated)
	}
}

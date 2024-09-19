package main

import (
	"encoding/json"
	"math"
	"net/http"
	"sync"
	"time"
)

type Taxi struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Location  LatLng `json:"location"`
	Available bool   `json:"available"`
	Busy      bool   `json:"busy"`
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
	Busy     bool   `json:"busy"`
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
				if taxis[i].Available && !taxis[i].Busy {
					closestClient := findClosestClient(taxis[i].Location)
					if closestClient != nil {
						taxis[i].Location = closestClient.Location
						taxis[i].Available = false
						taxis[i].Busy = true
						closestClient.Waiting = false
						closestClient.Busy = true
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
		if distance < minDistance && client.Waiting && !client.Busy {
			closestClient = &clients[i]
			minDistance = distance
		}
	}
	return closestClient
}

func getDistance(loc1, loc2 LatLng) float64 {
	const R = 6371 // Radius of the Earth in km
	lat1 := loc1.Lat * math.Pi / 180
	lat2 := loc2.Lat * math.Pi / 180
	deltaLat := (loc2.Lat - loc1.Lat) * math.Pi / 180
	deltaLng := (loc2.Lng - loc1.Lng) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*
			math.Sin(deltaLng/2)*math.Sin(deltaLng/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c // Distance in km
}

func taxisHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	if taxis == nil {
		taxis = []Taxi{}
	}

	if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(taxis); err != nil {
			http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
		}
	} else if r.Method == http.MethodPost {
		var newTaxi Taxi
		if err := json.NewDecoder(r.Body).Decode(&newTaxi); err != nil {
			http.Error(w, "Invalid request payload", http.StatusBadRequest)
			return
		}
		newTaxi.Busy = false
		taxis = append(taxis, newTaxi)
		w.WriteHeader(http.StatusCreated)
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(newTaxi); err != nil {
			http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
		}
	}
}

func clientsHandler(w http.ResponseWriter, r *http.Request) {
	mutex.Lock()
	defer mutex.Unlock()

	if clients == nil {
		clients = []Client{}
	}

	if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(clients)
	} else if r.Method == http.MethodPost {
		var newClient Client
		if err := json.NewDecoder(r.Body).Decode(&newClient); err != nil {
			http.Error(w, "Invalid request payload", http.StatusBadRequest)
			return
		}
		newClient.Waiting = true
		newClient.Busy = false
		clients = append(clients, newClient)
		w.WriteHeader(http.StatusCreated)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(newClient)
	}
}

// Initialize map
const map = L.map('map').setView([20, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// DOM elements
const addBtn = document.getElementById('add-btn');
const clearBtn = document.getElementById('clear-btn');
const modal = document.getElementById('trip-modal');
const closeBtn = document.querySelector('.close');
const tripForm = document.getElementById('trip-form');
const tripList = document.getElementById('trip-list');

// Trip data
let trips = JSON.parse(localStorage.getItem('trips')) || [];
let currentCoords = null;

// Initialize the application
function init() {
    renderTripList();
    renderMapMarkers();
    
    // Set up map click event
    map.on('click', function(e) {
        currentCoords = e.latlng;
        alert(`Coordinates set to: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`);
    });
}

// Render trip list in sidebar
function renderTripList() {
    tripList.innerHTML = '';
    
    if (trips.length === 0) {
        tripList.innerHTML = '<p>No trips added yet. Click "Add Trip" to start!</p>';
        return;
    }
    
    trips.forEach((trip, index) => {
        const tripEl = document.createElement('div');
        tripEl.className = 'trip-item';
        tripEl.innerHTML = `
            <h3>${trip.location}</h3>
            <p>${trip.date} • ${trip.lat.toFixed(2)}, ${trip.lng.toFixed(2)}</p>
            <p>${trip.notes || 'No notes'}</p>
            <button onclick="deleteTrip(${index})">Delete</button>
        `;
        tripList.appendChild(tripEl);
    });
}

// Render markers on map
function renderMapMarkers() {
    // Clear existing markers
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    
    // Add markers for each trip
    trips.forEach(trip => {
        L.marker([trip.lat, trip.lng])
            .addTo(map)
            .bindPopup(`
                <b>${trip.location}</b><br>
                ${trip.date}<br>
                ${trip.notes || ''}
            `);
    });
}

// Add new trip
tripForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentCoords) {
        alert('Please click on the map to set coordinates first!');
        return;
    }
    
    const newTrip = {
        location: document.getElementById('location').value,
        date: document.getElementById('trip-date').value,
        notes: document.getElementById('notes').value,
        lat: currentCoords.lat,
        lng: currentCoords.lng
    };
    
    trips.push(newTrip);
    localStorage.setItem('trips', JSON.stringify(trips));
    
    // Reset form and close modal
    tripForm.reset();
    currentCoords = null;
    modal.style.display = 'none';
    
    // Update UI
    renderTripList();
    renderMapMarkers();
});

// Delete trip
window.deleteTrip = function(index) {
    if (confirm('Are you sure you want to delete this trip?')) {
        trips.splice(index, 1);
        localStorage.setItem('trips', JSON.stringify(trips));
        renderTripList();
        renderMapMarkers();
    }
};

// Clear all trips
clearBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to delete ALL trips?')) {
        trips = [];
        localStorage.removeItem('trips');
        renderTripList();
        renderMapMarkers();
    }
});

// Modal controls
addBtn.addEventListener('click', function() {
    modal.style.display = 'block';
});

closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
});

window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Initialize the app
init();
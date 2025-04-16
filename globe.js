// Main variables
let scene, camera, renderer, globe, controls, raycaster;
let markers = [];
let selectedLocation = null;
const savedLocations = JSON.parse(localStorage.getItem('holidayLocations')) || [];

// DOM elements
const searchBox = document.getElementById('search-box');
const addBtn = document.getElementById('add-btn');
const clearBtn = document.getElementById('clear-btn');
const locationInfo = document.getElementById('location-info');
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();

// Initialize Three.js scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('globe').appendChild(renderer.domElement);

    // Add controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    // Create raycaster for mouse interactions
    raycaster = new THREE.Raycaster();

    // Create simple globe
    createSimpleGlobe();

    // Load saved locations
    loadSavedLocations();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onGlobeClick);
    addBtn.addEventListener('click', addMarkerFromSearch);
    clearBtn.addEventListener('click', clearMarkers);
    searchBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addMarkerFromSearch();
    });

    // Start animation loop
    animate();
}

// Create simple colored globe
function createSimpleGlobe() {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Simple blue/green color scheme
    const material = new THREE.MeshPhongMaterial({
        color: 0x1a73e8,
        specular: 0x111111,
        shininess: 5,
        transparent: true,
        opacity: 0.9
    });
    
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
}

// Handle globe clicks
function onGlobeClick(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObject(globe);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        const latLng = cartesianToLatLng(point);
        
        // Reverse geocode to get city name
        reverseGeocode(latLng.lat, latLng.lng)
            .then(city => {
                selectedLocation = { ...latLng, name: city };
                updateLocationInfo(`Selected: ${city} (${latLng.lat.toFixed(2)}, ${latLng.lng.toFixed(2)})`);
            })
            .catch(() => {
                selectedLocation = latLng;
                updateLocationInfo(`Selected coordinates: ${latLng.lat.toFixed(2)}, ${latLng.lng.toFixed(2)}`);
            });
    }
}

// Add marker from search box
function addMarkerFromSearch() {
    const query = searchBox.value.trim();
    if (!query) return;

    geocode(query)
        .then(result => {
            if (result) {
                addMarker(result.lat, result.lng, result.name);
                saveLocation(result.lat, result.lng, result.name);
                searchBox.value = '';
            }
        })
        .catch(err => {
            console.error("Geocoding error:", err);
            updateLocationInfo("Could not find that location");
        });
}

// Add marker to globe
function addMarker(lat, lng, name) {
    const position = latLngToCartesian(lat, lng, 1.02);
    
    // Create marker (red sphere)
    const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(position.x, position.y, position.z);
    
    // Store reference to the location
    marker.userData = { lat, lng, name };
    scene.add(marker);
    markers.push(marker);
    
    // Add to saved locations
    if (!savedLocations.some(loc => loc.name === name)) {
        savedLocations.push({ lat, lng, name });
        localStorage.setItem('holidayLocations', JSON.stringify(savedLocations));
    }
    
    updateLocationInfo(`Added: ${name} (${lat.toFixed(2)}, ${lng.toFixed(2)})`);
}

// Clear all markers
function clearMarkers() {
    markers.forEach(marker => scene.remove(marker));
    markers = [];
    localStorage.removeItem('holidayLocations');
    updateLocationInfo("Cleared all markers");
}

// Load saved locations
function loadSavedLocations() {
    savedLocations.forEach(location => {
        addMarker(location.lat, location.lng, location.name);
    });
}

// Save location to localStorage
function saveLocation(lat, lng, name) {
    savedLocations.push({ lat, lng, name });
    localStorage.setItem('holidayLocations', JSON.stringify(savedLocations));
}

// Update location info display
function updateLocationInfo(text) {
    locationInfo.textContent = text;
}

// Convert cartesian to lat/lng
function cartesianToLatLng(point) {
    const radius = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z);
    const lat = Math.asin(point.y / radius) * (180 / Math.PI);
    const lng = Math.atan2(point.z, point.x) * (180 / Math.PI);
    return { lat, lng };
}

// Convert lat/lng to cartesian
function latLngToCartesian(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    return {
        x: -(radius * Math.sin(phi) * Math.cos(theta)),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta)
    };
}

// Simple geocoding using Nominatim (OpenStreetMap)
async function geocode(query) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (data && data.length > 0) {
        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            name: data[0].display_name.split(',')[0] // Get just the city name
        };
    }
    throw new Error("Location not found");
}

// Simple reverse geocoding
async function reverseGeocode(lat, lng) {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await response.json();
    
    if (data && data.address) {
        return data.address.city || data.address.town || data.address.village || 
               data.address.county || data.address.state || "Unknown location";
    }
    throw new Error("Could not determine location");
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Initialize the app
init();
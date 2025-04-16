// Main variables
let scene, camera, renderer, globe, controls, raycaster;
let markers = [];
const savedLocations = JSON.parse(localStorage.getItem('holidayLocations')) || [];

// DOM elements
const searchBox = document.getElementById('search-box');
const addBtn = document.getElementById('add-btn');
const clearBtn = document.getElementById('clear-btn');
const locationInfo = document.getElementById('location-info');
const mouse = new THREE.Vector2();

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

    // Create simple globe with more visible features
    createEnhancedGlobe();

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

// Create enhanced globe with visible land masses
function createEnhancedGlobe() {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Create a more visually distinct globe
    const material = new THREE.MeshPhongMaterial({
        color: 0x1a73e8,
        specular: 0x111111,
        shininess: 5,
        transparent: true,
        opacity: 0.9,
        // Add some basic land/water contrast
        bumpScale: 0.05,
        combine: THREE.MixOperation
    });
    
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add lighting to make features visible
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add axis helper to ensure scene is working
    const axesHelper = new THREE.AxesHelper(1.5);
    scene.add(axesHelper);
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
        
        // Create a temporary marker at clicked position
        createTempMarker(point.x, point.y, point.z);
        
        // Try to get city name
        reverseGeocode(latLng.lat, latLng.lng)
            .then(city => {
                locationInfo.textContent = `Selected: ${city} (${latLng.lat.toFixed(2)}, ${latLng.lng.toFixed(2)})`;
            })
            .catch(() => {
                locationInfo.textContent = `Coordinates: ${latLng.lat.toFixed(2)}, ${latLng.lng.toFixed(2)}`;
            });
    }
}

// Create temporary marker (white)
function createTempMarker(x, y, z) {
    // Remove any existing temp markers
    scene.children.filter(obj => obj.userData.isTempMarker).forEach(marker => scene.remove(marker));
    
    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(x, y, z);
    marker.userData = { isTempMarker: true };
    scene.add(marker);
    
    // Remove after 2 seconds
    setTimeout(() => {
        if (marker.parent) scene.remove(marker);
    }, 2000);
}

// Add marker from search box
function addMarkerFromSearch() {
    const query = searchBox.value.trim();
    if (!query) return;

    locationInfo.textContent = "Searching...";
    
    geocode(query)
        .then(result => {
            if (result) {
                addMarker(result.lat, result.lng, result.name);
                saveLocation(result.lat, result.lng, result.name);
                searchBox.value = '';
                locationInfo.textContent = `Added: ${result.name}`;
            }
        })
        .catch(err => {
            console.error("Geocoding error:", err);
            locationInfo.textContent = "Could not find that location";
        });
}

// Add permanent marker (red)
function addMarker(lat, lng, name) {
    const position = latLngToCartesian(lat, lng, 1.02);
    
    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(position.x, position.y, position.z);
    marker.userData = { lat, lng, name };
    scene.add(marker);
    markers.push(marker);
}

// Clear all markers
function clearMarkers() {
    markers.forEach(marker => scene.remove(marker));
    markers = [];
    localStorage.removeItem('holidayLocations');
    locationInfo.textContent = "Cleared all markers";
}

// Load saved locations
function loadSavedLocations() {
    savedLocations.forEach(location => {
        addMarker(location.lat, location.lng, location.name);
    });
    
    if (savedLocations.length > 0) {
        locationInfo.textContent = `Loaded ${savedLocations.length} saved locations`;
    }
}

// Save location to localStorage
function saveLocation(lat, lng, name) {
    // Check if already exists
    if (!savedLocations.some(loc => loc.name === name)) {
        savedLocations.push({ lat, lng, name });
        localStorage.setItem('holidayLocations', JSON.stringify(savedLocations));
    }
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
    try {
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
    } catch (error) {
        console.error("Geocoding failed:", error);
        throw error;
    }
}

// Simple reverse geocoding
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        
        if (data && data.address) {
            return data.address.city || data.address.town || data.address.village || 
                   data.address.county || data.address.state || "Unknown location";
        }
        throw new Error("Could not determine location");
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
        throw error;
    }
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
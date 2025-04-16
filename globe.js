// Main variables
let scene, camera, renderer, globe, controls;
let locations = JSON.parse(localStorage.getItem('travelLocations')) || [];
let markers = [];

// DOM elements
const addBtn = document.getElementById('add-btn');
const clearBtn = document.getElementById('clear-btn');
const modal = document.getElementById('location-modal');
const closeBtn = document.querySelector('.close');
const locationForm = document.getElementById('location-form');
const locationsList = document.getElementById('locations-list');

// Initialize Three.js scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

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
    controls.minDistance = 1.5;
    controls.maxDistance = 5;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create globe
    createGlobe();

    // Load saved locations
    loadLocations();

    // Render scene
    animate();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    addBtn.addEventListener('click', () => modal.style.display = 'block');
    clearBtn.addEventListener('click', clearAllLocations);
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    locationForm.addEventListener('submit', addNewLocation);
}

// Create 3D globe
function createGlobe() {
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Load texture (you can replace this with your own texture)
    const texture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');
    const bumpMap = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg');
    const specularMap = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg');
    
    const material = new THREE.MeshPhongMaterial({
        map: texture,
        bumpMap: bumpMap,
        bumpScale: 0.05,
        specularMap: specularMap,
        specular: new THREE.Color('grey'),
        shininess: 5
    });
    
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add clouds
    const cloudGeometry = new THREE.SphereGeometry(1.01, 64, 64);
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png'),
        transparent: true,
        opacity: 0.4
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);
}

// Add marker to globe
function addMarker(location) {
    const lat = location.lat * Math.PI / 180;
    const lng = -location.lng * Math.PI / 180;
    const radius = 1.02;
    
    // Convert spherical to Cartesian coordinates
    const x = radius * Math.cos(lat) * Math.cos(lng);
    const y = radius * Math.sin(lat);
    const z = radius * Math.cos(lat) * Math.sin(lng);
    
    // Create marker (red sphere)
    const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(x, y, z);
    
    // Add label (HTML element)
    const label = document.createElement('div');
    label.className = 'location-label';
    label.textContent = location.name;
    label.style.position = 'absolute';
    label.style.color = 'white';
    label.style.backgroundColor = 'rgba(0,0,0,0.7)';
    label.style.padding = '2px 5px';
    label.style.borderRadius = '3px';
    label.style.fontSize = '12px';
    label.style.pointerEvents = 'none';
    
    // Store reference to the location
    marker.userData = { location, label };
    
    scene.add(marker);
    document.body.appendChild(label);
    markers.push({ marker, label });
    
    // Update label position
    updateLabelPositions();
}

// Update label positions based on camera view
function updateLabelPositions() {
    markers.forEach(({ marker, label }) => {
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(marker.matrixWorld);
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
        
        label.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
        label.style.display = vector.z > 1 ? 'none' : 'block';
    });
}

// Load saved locations
function loadLocations() {
    locations.forEach(location => {
        addMarker(location);
        addLocationToUI(location);
    });
}

// Add location to UI list
function addLocationToUI(location) {
    const item = document.createElement('div');
    item.className = 'location-item';
    item.innerHTML = `
        <h3>${location.name}</h3>
        <p>${new Date(location.date).toLocaleDateString()}</p>
        <p>${location.notes || ''}</p>
        <button onclick="removeLocation(${locations.indexOf(location)})">Remove</button>
    `;
    locationsList.appendChild(item);
}

// Add new location
function addNewLocation(e) {
    e.preventDefault();
    
    const name = document.getElementById('location-name').value;
    const date = document.getElementById('visit-date').value;
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const notes = document.getElementById('location-notes').value;
    
    if (!name || !date || isNaN(lat) || isNaN(lng)) {
        alert('Please fill all required fields with valid data');
        return;
    }
    
    const newLocation = { name, date, lat, lng, notes };
    locations.push(newLocation);
    localStorage.setItem('travelLocations', JSON.stringify(locations));
    
    addMarker(newLocation);
    addLocationToUI(newLocation);
    
    // Reset form and close modal
    locationForm.reset();
    modal.style.display = 'none';
}

// Remove location
window.removeLocation = function(index) {
    if (confirm('Remove this location?')) {
        // Remove from scene
        scene.remove(markers[index].marker);
        document.body.removeChild(markers[index].label);
        
        // Remove from arrays
        locations.splice(index, 1);
        markers.splice(index, 1);
        
        // Update storage and UI
        localStorage.setItem('travelLocations', JSON.stringify(locations));
        locationsList.innerHTML = '';
        locations.forEach(location => addLocationToUI(location));
    }
};

// Clear all locations
function clearAllLocations() {
    if (confirm('Remove ALL locations?')) {
        // Remove all markers from scene
        markers.forEach(({ marker, label }) => {
            scene.remove(marker);
            document.body.removeChild(label);
        });
        
        // Clear arrays
        locations = [];
        markers = [];
        
        // Update storage and UI
        localStorage.removeItem('travelLocations');
        locationsList.innerHTML = '<p>No locations added yet</p>';
    }
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateLabelPositions();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    updateLabelPositions();
}

// Initialize the app
init();
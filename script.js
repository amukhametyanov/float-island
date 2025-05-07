import * as THREE from 'three';

let scene, camera, renderer, initialIslandGroup, directionalLight;
const clock = new THREE.Clock();
const animatedObjects = []; // For non-editor animations (bobbing, glow, etc.)
const placedObjects = { islands: [], trees: [], rocks: [] }; // For editor-placed objects

// Keyboard controls state (for camera)
const keysPressed = {};
const moveSpeed = 5;
const rotateSpeed = 1.5;

// Editor state
let editorMode = 'view'; // 'view', 'placing_island', 'placing_tree', 'placing_rock'
let ghostMesh = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let placementPlane; // For placing islands

// UI Elements
let currentModeText;

// --- Standard Materials (reusable) ---
const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x66BB6A, flatShading: true, roughness: 0.8, metalness: 0.1 });
const rockEarthMaterial = new THREE.MeshStandardMaterial({ color: 0x8D6E63, flatShading: true, roughness: 0.9, metalness: 0.0 });
const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0xAFEEEE, emissive: 0xAFEEEE, emissiveIntensity: 0.5, flatShading: true, roughness: 0.3, metalness: 0.2 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x795548, flatShading: true, roughness: 0.8 });
const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50, flatShading: true, roughness: 0.8 });
const simpleRockMaterial = new THREE.MeshStandardMaterial({ color: 0x9E9E9E, flatShading: true, roughness: 0.9 }); // Grey for rocks
const ghostMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500, transparent: true, opacity: 0.6, flatShading: true });
const collisionGhostMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.7, flatShading: true });


function init() {
    currentModeText = document.getElementById('current-mode-text');

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xADD8E6, 10, 80); // Increased fog distance

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 20);
    camera.lookAt(0, 0, 0);

    const container = document.getElementById('scene-container');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xAAAAFF, 0.8);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xFFE4B5, 2);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    // ... (shadow camera setup as before)
    scene.add(directionalLight);

    // Initial Scene Content
    initialIslandGroup = createIslandInstance(new THREE.Vector3(0, 0, 0)); // Create the first island
    initialIslandGroup.name = "InitialIsland";
    scene.add(initialIslandGroup);
    placedObjects.islands.push(initialIslandGroup);
    
    // Add userData to all meshes in the island for raycasting
    initialIslandGroup.traverse(child => {
        if (child.isMesh) {
            child.userData.isIslandPart = true;
            child.userData.parentIslandGroup = initialIslandGroup;
        }
    });

    createInitialTrees(initialIslandGroup, 2); // Add some trees to the first island
    createClouds(5);

    // Placement Plane (invisible, for placing new islands)
    const planeGeometry = new THREE.PlaneGeometry(200, 200);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    placementPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    placementPlane.rotation.x = -Math.PI / 2; // Horizontal
    placementPlane.position.y = -0.1; // Slightly below island bases
    placementPlane.name = "PlacementPlane";
    scene.add(placementPlane);

    // Event Listeners
    setupEditorUI();
    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
        if (editorMode === 'view' && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "s", "pageup", "pagedown"].includes(event.key.toLowerCase())) {
            event.preventDefault();
        }
    });
    document.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
    });
    window.addEventListener('resize', onWindowResize, false);

    animate();
}

// --- Object Creation Functions (for single instances) ---
function createIslandInstance(position) {
    const islandGroup = new THREE.Group();
    islandGroup.position.copy(position);

    const topGeometry = new THREE.CylinderGeometry(5, 4.5, 2, 8, 1);
    const islandTop = new THREE.Mesh(topGeometry, grassMaterial.clone()); // Clone material for potential individual changes
    islandTop.position.y = 0;
    islandTop.castShadow = true;
    islandTop.receiveShadow = true;
    islandTop.name = "IslandTop";
    islandTop.userData.isIslandPart = true; 
    islandTop.userData.parentIslandGroup = islandGroup;
    islandGroup.add(islandTop);

    const bottomGeometry = new THREE.ConeGeometry(4.5, 4, 8, 3);
    const islandBottom = new THREE.Mesh(bottomGeometry, rockEarthMaterial.clone());
    islandBottom.position.y = -3;
    islandBottom.rotation.x = Math.PI;
    islandBottom.castShadow = true;
    islandBottom.receiveShadow = true;
    islandBottom.name = "IslandBottom";
    islandBottom.userData.isIslandPart = true;
    islandBottom.userData.parentIslandGroup = islandGroup;
    islandGroup.add(islandBottom);
    
    // Add a simple "crystal" to each island for visual interest
    const crystalGeom = new THREE.IcosahedronGeometry(0.8, 0);
    const crystal = new THREE.Mesh(crystalGeom, crystalMaterial.clone());
    crystal.position.set(0, 1.5, 0); // On top of the island
    crystal.castShadow = true;
    crystal.name = "IslandCrystal";
    islandGroup.add(crystal);
    animatedObjects.push({mesh: crystal, type: 'crystal_glow'}); // Original animation still applies

    // Bounding box for collision
    islandGroup.userData.boundingBox = new THREE.Box3().setFromObject(islandGroup);
    
    // Add to general animated objects for bobbing
    animatedObjects.push({mesh: islandGroup, type: 'island_bob', initialY: islandGroup.position.y, bobSpeed: 0.4 + Math.random() * 0.2, bobAmount: 0.15 + Math.random() * 0.1 });

    return islandGroup;
}

function createTreeInstance(position, rotationY = 0) {
    const treeGroup = new THREE.Group();
    treeGroup.position.copy(position);
    treeGroup.rotation.y = rotationY;

    const trunkHeight = Math.random() * 1 + 1;
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 5);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial.clone());
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    trunk.name = "TreeTrunk";
    treeGroup.add(trunk);

    const canopyRadius = Math.random() * 0.5 + 0.8;
    const canopyGeometry = new THREE.IcosahedronGeometry(canopyRadius, 0);
    const canopy = new THREE.Mesh(canopyGeometry, leavesMaterial.clone());
    canopy.position.y = trunkHeight / 2 + canopyRadius * 0.7;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    canopy.name = "TreeCanopy";
    treeGroup.add(canopy);

    // Add to animated objects for sway
    animatedObjects.push({mesh: canopy, type: 'tree_sway', initialRotation: canopy.rotation.clone(), swaySpeed: Math.random() * 0.5 + 0.2, swayAmount: Math.random() * 0.05 + 0.02});
    return treeGroup;
}

function createRockInstance(position, rotationY = 0) {
    const rockSize = Math.random() * 0.4 + 0.3;
    // Using Dodecahedron for a more irregular rock shape
    const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0); 
    const rock = new THREE.Mesh(rockGeometry, simpleRockMaterial.clone());
    rock.position.copy(position);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.name = "Rock";
    return rock;
}

// --- Initial Scene Setup Functions (modified) ---
function createInitialTrees(onIslandGroup, count) {
    const islandTopMesh = onIslandGroup.getObjectByName("IslandTop");
    if (!islandTopMesh) return;

    // Get the approximate radius of the island top for placement
    const islandRadius = islandTopMesh.geometry.parameters.radiusTop * 0.8; 

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * islandRadius;
        const treeX = Math.cos(angle) * radius;
        const treeZ = Math.sin(angle) * radius;
        
        // Raycast down from above the tree position to find the exact Y on the island surface
        const treeStartPos = new THREE.Vector3(treeX, 10, treeZ); // Start high
        treeStartPos.applyMatrix4(onIslandGroup.matrixWorld); // Convert to world space
        
        const localTreePos = new THREE.Vector3(treeX, 1, treeZ); // Default Y if raycast fails

        const tree = createTreeInstance(localTreePos, Math.random() * Math.PI * 2);
        onIslandGroup.add(tree); // Add tree as child of the island
        placedObjects.trees.push(tree);
    }
}

function createClouds(count) { /* ... (same as before, ensure they are added to `scene`) ... */ 
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, flatShading: true, opacity: 0.85,
        transparent: true, roughness: 0.9
    });

    for (let i = 0; i < count; i++) {
        const cloudGroup = new THREE.Group();
        const numPuffs = Math.floor(Math.random() * 3) + 3;
        for (let j = 0; j < numPuffs; j++) {
            const puffRadius = Math.random() * 1 + 0.8;
            const puffGeometry = new THREE.IcosahedronGeometry(puffRadius, 0);
            const puff = new THREE.Mesh(puffGeometry, cloudMaterial);
            puff.position.set(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 2
            );
            puff.castShadow = true;
            cloudGroup.add(puff);
        }
        
        cloudGroup.position.set(
            (Math.random() - 0.5) * 60, // Wider spread for clouds
            Math.random() * 8 + 12,     // Higher clouds
            (Math.random() - 0.5) * 50 - 20 
        );
        scene.add(cloudGroup);
        // Add to animatedObjects for drift, not placedObjects for editor
        animatedObjects.push({mesh: cloudGroup, type: 'cloud_drift', speed: Math.random() * 0.3 + 0.1, initialX: cloudGroup.position.x, initialZ: cloudGroup.position.z});
    }
}


// --- Editor UI and Logic ---
function setupEditorUI() {
    document.getElementById('btn-view-mode').addEventListener('click', () => setEditorMode('view'));
    document.getElementById('btn-add-island').addEventListener('click', () => setEditorMode('placing_island'));
    document.getElementById('btn-add-tree').addEventListener('click', () => setEditorMode('placing_tree'));
    document.getElementById('btn-add-rock').addEventListener('click', () => setEditorMode('placing_rock'));
    updateActiveButton();
}

function setEditorMode(mode) {
    editorMode = mode;
    currentModeText.textContent = mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    updateActiveButton();

    if (ghostMesh) {
        scene.remove(ghostMesh);
        ghostMesh.geometry.dispose(); // Clean up geometry
        // Material is shared, no need to dispose unless it was unique
        ghostMesh = null;
    }
    document.getElementById('scene-container').style.cursor = 'default';

    if (editorMode === 'placing_island') {
        const islandGhostGeomTop = new THREE.CylinderGeometry(5, 4.5, 2, 8, 1);
        const islandGhostGeomBottom = new THREE.ConeGeometry(4.5, 4, 8, 3);
        
        ghostMesh = new THREE.Group();
        const ghostTop = new THREE.Mesh(islandGhostGeomTop, ghostMaterial);
        ghostTop.position.y = 0;
        const ghostBottom = new THREE.Mesh(islandGhostGeomBottom, ghostMaterial);
        ghostBottom.position.y = -3;
        ghostBottom.rotation.x = Math.PI;
        ghostMesh.add(ghostTop);
        ghostMesh.add(ghostBottom);
        
        ghostMesh.visible = false;
        scene.add(ghostMesh);
        document.getElementById('scene-container').style.cursor = 'crosshair';
    } else if (editorMode === 'placing_tree') {
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 5);
        const canopyGeometry = new THREE.IcosahedronGeometry(1, 0);
        
        ghostMesh = new THREE.Group();
        const ghostTrunk = new THREE.Mesh(trunkGeometry, ghostMaterial);
        const ghostCanopy = new THREE.Mesh(canopyGeometry, ghostMaterial);
        ghostCanopy.position.y = 1.5 / 2 + 1 * 0.7;
        ghostMesh.add(ghostTrunk);
        ghostMesh.add(ghostCanopy);

        ghostMesh.visible = false;
        scene.add(ghostMesh);
        document.getElementById('scene-container').style.cursor = 'crosshair';
    } else if (editorMode === 'placing_rock') {
        const rockSize = 0.5;
        const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
        ghostMesh = new THREE.Mesh(rockGeometry, ghostMaterial);
        ghostMesh.visible = false;
        scene.add(ghostMesh);
        document.getElementById('scene-container').style.cursor = 'crosshair';
    }
}

function updateActiveButton() {
    document.querySelectorAll('#editor-ui button').forEach(btn => btn.classList.remove('active'));
    if (editorMode === 'view') document.getElementById('btn-view-mode').classList.add('active');
    else if (editorMode === 'placing_island') document.getElementById('btn-add-island').classList.add('active');
    else if (editorMode === 'placing_tree') document.getElementById('btn-add-tree').classList.add('active');
    else if (editorMode === 'placing_rock') document.getElementById('btn-add-rock').classList.add('active');
}

function onMouseMove(event) {
    if (editorMode === 'view' || !ghostMesh) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    ghostMesh.visible = true;
    let intersects;

    if (editorMode === 'placing_island') {
        intersects = raycaster.intersectObject(placementPlane);
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;
            ghostMesh.position.set(intersectPoint.x, 0, intersectPoint.z); // Place base at y=0
            
            // Collision detection for islands
            const currentGhostBB = new THREE.Box3().setFromObject(ghostMesh);
            let isColliding = false;
            for (const island of placedObjects.islands) {
                const islandBB = island.userData.boundingBox.clone().translate(island.position);
                if (currentGhostBB.intersectsBox(islandBB)) {
                    isColliding = true;
                    break;
                }
            }
            ghostMesh.traverse(child => {
                if(child.isMesh) child.material = isColliding ? collisionGhostMaterial : ghostMaterial;
            });
            ghostMesh.userData.canPlace = !isColliding;
        } else {
            ghostMesh.visible = false;
        }
    } else if (editorMode === 'placing_tree' || editorMode === 'placing_rock') {
        const islandParts = [];
        placedObjects.islands.forEach(island => {
            island.traverse(child => {
                if (child.isMesh && child.userData.isIslandPart) { // Check for specific island parts
                    islandParts.push(child);
                }
            });
        });

        intersects = raycaster.intersectObjects(islandParts, false); // Non-recursive as we provide parts

        if (intersects.length > 0) {
            const intersect = intersects[0];
            ghostMesh.position.copy(intersect.point);
            
            // Align to surface normal (optional, can be tricky for complex low-poly)
            // const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersect.object.matrixWorld);
            // const worldNormal = intersect.face.normal.clone().applyMatrix3(normalMatrix).normalize();
            // ghostMesh.lookAt(intersect.point.clone().add(worldNormal));
            // For simpler placement, just ensure it's "on top"
            ghostMesh.position.y += (editorMode === 'placing_tree' ? 0.75 : 0.25); // Adjust Y offset for base

            ghostMesh.userData.canPlace = true;
            ghostMesh.userData.targetIsland = intersect.object.userData.parentIslandGroup;
            ghostMesh.traverse(child => {
                 if(child.isMesh) child.material = ghostMaterial;
            });
        } else {
            ghostMesh.visible = false;
            ghostMesh.userData.canPlace = false;
        }
    }
}

function onMouseDown(event) {
    if (event.button !== 0) return; // Only left click

    if (editorMode !== 'view' && ghostMesh && ghostMesh.visible && ghostMesh.userData.canPlace) {
        let newObject;
        if (editorMode === 'placing_island') {
            newObject = createIslandInstance(ghostMesh.position);
            scene.add(newObject);
            // Add userData to all meshes in the new island for future raycasting
            newObject.traverse(child => {
                if (child.isMesh) {
                    child.userData.isIslandPart = true;
                    child.userData.parentIslandGroup = newObject;
                }
            });
            placedObjects.islands.push(newObject);
            newObject.userData.boundingBox = new THREE.Box3().setFromObject(newObject); // Update its own BB
        } else if (editorMode === 'placing_tree') {
            newObject = createTreeInstance(ghostMesh.position);
            if (ghostMesh.userData.targetIsland) {
                ghostMesh.userData.targetIsland.add(newObject); // Parent to the island
                placedObjects.trees.push(newObject);
            } else { scene.add(newObject); } // Fallback if no target island
        } else if (editorMode === 'placing_rock') {
            newObject = createRockInstance(ghostMesh.position);
             if (ghostMesh.userData.targetIsland) {
                ghostMesh.userData.targetIsland.add(newObject); // Parent to the island
                placedObjects.rocks.push(newObject);
            } else { scene.add(newObject); }
        }
        
        // Optional: Keep placing current object type
        // setEditorMode(editorMode); // This will recreate the ghostMesh
        // Or switch back to view mode:
        // setEditorMode('view'); 
    }
}


// --- Camera and Animation ---
function updateCamera(delta) {
    if (editorMode !== 'view') return; // Disable camera controls if not in view mode

    const moveDistance = moveSpeed * delta;
    const rotateAngle = rotateSpeed * delta;

    if (keysPressed['arrowup']) camera.translateZ(-moveDistance);
    if (keysPressed['arrowdown']) camera.translateZ(moveDistance);
    if (keysPressed['arrowleft']) camera.rotateY(rotateAngle);
    if (keysPressed['arrowright']) camera.rotateY(-rotateAngle);
    if (keysPressed['w'] || keysPressed['pageup']) camera.position.y += moveDistance;
    if (keysPressed['s'] || keysPressed['pagedown']) camera.position.y -= moveDistance;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    updateCamera(delta);

    // Dynamic light movement
    if (directionalLight) {
        directionalLight.position.x = Math.sin(elapsedTime * 0.2) * 20; // Wider light swing
        directionalLight.position.z = Math.cos(elapsedTime * 0.2) * 20;
    }
    
    // Animate individual objects (bobbing islands, swaying trees, glowing crystals, drifting clouds)
    animatedObjects.forEach(objData => {
        const obj = objData.mesh;
        if (!obj) return;

        if (objData.type === 'island_bob' && obj.parent === scene) { // Only bob top-level islands
             obj.position.y = objData.initialY + Math.sin(elapsedTime * objData.bobSpeed) * objData.bobAmount;
             obj.userData.boundingBox.copy(new THREE.Box3().setFromObject(obj)).translate(obj.position.clone().sub(obj.userData.boundingBox.getCenter(new THREE.Vector3())));
        } else if (objData.type === 'tree_sway' && obj.material) { // Canopy is the objData.mesh
            obj.rotation.z = objData.initialRotation.z + Math.sin(elapsedTime * objData.swaySpeed) * objData.swayAmount;
            obj.rotation.x = objData.initialRotation.x + Math.cos(elapsedTime * objData.swaySpeed * 0.7) * objData.swayAmount * 0.5;
        } else if (objData.type === 'crystal_glow' && obj.material && obj.material.emissiveIntensity !== undefined) {
            obj.material.emissiveIntensity = 0.4 + Math.sin(elapsedTime * 1.5) * 0.2;
        } else if (objData.type === 'cloud_drift') {
            obj.position.x += objData.speed * delta;
            if (obj.position.x > 50) { // Wider reset range
                obj.position.x = -50;
                obj.position.z = objData.initialZ + (Math.random() -0.5) * 10; // Slight Z variation on reset
            }
        }
    });

    renderer.render(scene, camera);
}

init();
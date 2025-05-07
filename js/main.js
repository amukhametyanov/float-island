// js/main.js
import * as THREE from 'three';
import { initSceneAndCamera, initRenderer, initLights, createPlacementPlane, onWindowResize } from './sceneSetup.js';
import { createIslandInstance, createCloudGroup, createTreeInstance } from './objectFactory.js'; // Assuming createInitialTrees exists or you add it
import { updateAnimations, updateLightAnimation } from './animations.js';
import { initCameraControls, updateCamera } from './cameraControls.js';
import { initEditor } from './editor.js';

let scene, camera, renderer, directionalLight, clock;

function init() {
    clock = new THREE.Clock();
    const sceneContainer = document.getElementById('scene-container');

    // Scene Setup
    const sceneCam = initSceneAndCamera();
    scene = sceneCam.scene;
    camera = sceneCam.camera;

    renderer = initRenderer(sceneContainer);
    directionalLight = initLights(scene);
    const placementPlane = createPlacementPlane(scene);

    // Initial Objects
    const initialIsland = createIslandInstance(new THREE.Vector3(0, 0, 0));
    scene.add(initialIsland);
    // Manually add to placedObjects if editor needs to know about it from start
    // This part is tricky as placedObjects is in editor.js. 
    // For simplicity, editor currently only knows what it places.
    // To make editor aware of initial island for collision:
    // 1. Export placedObjects from editor and add here (circular dependency risk)
    // 2. Pass initialIsland to initEditor to register it. (Chosen below)

    // Example of adding some trees to the initial island:
    // This function would need to be added to objectFactory.js or be here
    addTreesToIsland(initialIsland, 2); 


    for (let i = 0; i < 5; i++) {
        const cloud = createCloudGroup();
        scene.add(cloud);
    }

    // Controls & Editor
    initCameraControls(camera, sceneContainer); // Pass sceneContainer for keyboard focus
    initEditor(scene, camera, placementPlane, sceneContainer);
    
    // Register initial island with editor for collision (if editor needs it)
    // This requires editor.js to expose a function like registerPlacedObject
    // For now, we'll assume editor only checks against things it places.
    // If initialIsland should not be overlapped, it needs to be in editor's `placedObjects.islands`.
    // Simplest way for now: editor.js should manage its own placedObjects from clicks.
    // If you want the initial island to be part of the collision system from the start:
    // you might need to modify editor.js to accept initial objects or export placedObjects.

    window.addEventListener('resize', () => onWindowResize(camera, renderer));
    animate();
}

// Helper to add initial trees, could be in objectFactory.js
function addTreesToIsland(islandGroup, count) {
    const islandTopMesh = islandGroup.getObjectByName("IslandTop");
    if (!islandTopMesh) {
        console.warn("Could not find IslandTop mesh to place trees on.");
        return;
    }
    const islandRadius = islandTopMesh.geometry.parameters.radiusTop * 0.8;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * islandRadius; // Place within 80% of the radius
        const treeX = Math.cos(angle) * radius;
        const treeZ = Math.sin(angle) * radius;
        
        // Approximate Y position on the island top. 
        // For more accuracy, you'd raycast downwards from above this point onto the islandTopMesh.
        const treeY = islandTopMesh.position.y + (islandTopMesh.geometry.parameters.height / 2) + 0.1; // Approx on top surface

        // Use createTreeInstance directly
        const tree = createTreeInstance(new THREE.Vector3(treeX, treeY, treeZ), Math.random() * Math.PI * 2);
        
        // createTreeInstance (from objectFactory) already adds the tree to animatedObjects.
        // We just need to add it as a child to the islandGroup.
        islandGroup.add(tree);
    }
}


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    updateCamera(delta);
    updateAnimations(delta, elapsedTime);
    updateLightAnimation(directionalLight, elapsedTime);
    // No explicit editor.update() needed as it's event-driven for ghost/placement

    renderer.render(scene, camera);
}

init();
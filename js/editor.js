// js/editor.js
import * as THREE from 'three';
import {
    createIslandInstance, createTreeInstance, createRockInstance,
    createIslandGhostMesh, createTreeGhostMesh, createRockGhostMesh
} from './objectFactory.js';
import { ghostMaterial, collisionGhostMaterial } from './config.js';
import { setCameraControlsActive } from './cameraControls.js';

let editorMode = 'view';
let ghostMesh = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let currentScene, currentCamera, placementPlaneRef;
const placedObjects = { islands: [], trees: [], rocks: [] };

let currentModeTextElement;
let sceneContainerElement;


export function initEditor(_scene, _camera, _placementPlane, _sceneContainer) {
    currentScene = _scene;
    currentCamera = _camera;
    placementPlaneRef = _placementPlane;
    sceneContainerElement = _sceneContainer;

    currentModeTextElement = document.getElementById('current-mode-text');

    document.getElementById('btn-view-mode').addEventListener('click', () => setEditorMode('view'));
    document.getElementById('btn-add-island').addEventListener('click', () => setEditorMode('placing_island'));
    document.getElementById('btn-add-tree').addEventListener('click', () => setEditorMode('placing_tree'));
    document.getElementById('btn-add-rock').addEventListener('click', () => setEditorMode('placing_rock'));
    
    sceneContainerElement.addEventListener('mousemove', onEditorMouseMove);
    sceneContainerElement.addEventListener('mousedown', onEditorMouseDown);
    
    setEditorMode('view'); // Initialize
}

function updateActiveButton() {
    document.querySelectorAll('#editor-ui button').forEach(btn => btn.classList.remove('active'));
    if (editorMode === 'view') document.getElementById('btn-view-mode').classList.add('active');
    else if (editorMode === 'placing_island') document.getElementById('btn-add-island').classList.add('active');
    else if (editorMode === 'placing_tree') document.getElementById('btn-add-tree').classList.add('active');
    else if (editorMode === 'placing_rock') document.getElementById('btn-add-rock').classList.add('active');
}

function setEditorMode(mode) {
    editorMode = mode;
    currentModeTextElement.textContent = mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    updateActiveButton();
    setCameraControlsActive(mode === 'view');

    if (ghostMesh) {
        currentScene.remove(ghostMesh);
        if (ghostMesh.geometry) ghostMesh.geometry.dispose(); // Single mesh
        else { // Group
             ghostMesh.traverse(child => { if (child.isMesh && child.geometry) child.geometry.dispose();});
        }
        ghostMesh = null;
    }
    sceneContainerElement.style.cursor = 'default';

    if (mode === 'placing_island') ghostMesh = createIslandGhostMesh();
    else if (mode === 'placing_tree') ghostMesh = createTreeGhostMesh();
    else if (mode === 'placing_rock') ghostMesh = createRockGhostMesh();

    if (ghostMesh) {
        ghostMesh.visible = false;
        currentScene.add(ghostMesh);
        sceneContainerElement.style.cursor = 'crosshair';
    }
}

function onEditorMouseMove(event) {
    if (editorMode === 'view' || !ghostMesh) return;

    const rect = sceneContainerElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, currentCamera);

    ghostMesh.visible = true;
    let intersects;

    if (editorMode === 'placing_island') {
        intersects = raycaster.intersectObject(placementPlaneRef);
        if (intersects.length > 0) {
            const intersectPoint = intersects[0].point;
            ghostMesh.position.set(intersectPoint.x, 0, intersectPoint.z);
            
            const currentGhostBB = new THREE.Box3().setFromObject(ghostMesh);
            let isColliding = false;
            for (const island of placedObjects.islands) {
                // Ensure island.userData.boundingBox is world space or convert it
                const islandWorldBB = island.userData.boundingBox.clone().applyMatrix4(island.matrixWorld);
                if (currentGhostBB.intersectsBox(islandWorldBB)) {
                    isColliding = true;
                    break;
                }
            }
            const materialToUse = isColliding ? collisionGhostMaterial : ghostMaterial;
            ghostMesh.traverse(child => { if (child.isMesh) child.material = materialToUse; });
            ghostMesh.userData.canPlace = !isColliding;
        } else {
            ghostMesh.visible = false;
            ghostMesh.userData.canPlace = false;
        }
    } else if (editorMode === 'placing_tree' || editorMode === 'placing_rock') {
        const islandMeshes = [];
        placedObjects.islands.forEach(islandGroup => {
            islandGroup.traverse(child => {
                if (child.isMesh && child.userData.isIslandPart) islandMeshes.push(child);
            });
        });

        intersects = raycaster.intersectObjects(islandMeshes, false);
        if (intersects.length > 0) {
            const intersect = intersects[0];
            ghostMesh.position.copy(intersect.point);
            ghostMesh.position.y += (editorMode === 'placing_tree' ? 0.75 : 0.25); // Adjust Y
            ghostMesh.userData.canPlace = true;
            ghostMesh.userData.targetIsland = intersect.object.userData.parentIslandGroup;
            ghostMesh.traverse(child => { if (child.isMesh) child.material = ghostMaterial; });
        } else {
            ghostMesh.visible = false;
            ghostMesh.userData.canPlace = false;
        }
    }
}

function onEditorMouseDown(event) {
    if (event.button !== 0 || editorMode === 'view' || !ghostMesh || !ghostMesh.visible || !ghostMesh.userData.canPlace) {
        return;
    }

    let newObject;
    if (editorMode === 'placing_island') {
        newObject = createIslandInstance(ghostMesh.position);
        currentScene.add(newObject);
        newObject.traverse(child => {
            if (child.isMesh) {
                child.userData.isIslandPart = true;
                child.userData.parentIslandGroup = newObject;
            }
        });
        newObject.userData.boundingBox = new THREE.Box3().setFromObject(newObject); // Initial local BB
        placedObjects.islands.push(newObject);
    } else if (editorMode === 'placing_tree') {
        newObject = createTreeInstance(ghostMesh.position);
        if (ghostMesh.userData.targetIsland) {
            ghostMesh.userData.targetIsland.add(newObject);
            placedObjects.trees.push(newObject);
        } else { currentScene.add(newObject); } // Fallback
    } else if (editorMode === 'placing_rock') {
        newObject = createRockInstance(ghostMesh.position);
        if (ghostMesh.userData.targetIsland) {
            ghostMesh.userData.targetIsland.add(newObject);
            placedObjects.rocks.push(newObject);
        } else { currentScene.add(newObject); } // Fallback
    }
}
// js/editor.js
import * as THREE from 'three';
import {
    createIslandInstance, createTreeInstance, createRockInstance,
    createIslandGhostMesh, createTreeGhostMesh, createRockGhostMesh
} from './objectFactory.js';
import { ghostMaterial, collisionGhostMaterial } from './config.js';
import { setCameraControlsActive } from './cameraControls.js';
import { removeAnimatedObjectByMesh } from './animations.js'; // Import removal helper

let editorMode = 'view';
let ghostMesh = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let currentScene, currentCamera, placementPlaneRef;
const placedObjects = { islands: [], trees: [], rocks: [] };

let currentModeTextElement;
let sceneContainerElement;

const TREE_COLLISION_RADIUS = 1.0;

// For highlighting objects in remove mode
let highlightedObject = null;
const originalMaterials = new Map(); // To store original materials of highlighted objects
const REMOVE_HIGHLIGHT_MATERIAL = new THREE.MeshStandardMaterial({
    emissive: 0xff4444, // Bright red emissive for removal highlight
    emissiveIntensity: 0.8,
    flatShading: true,
    // side: THREE.DoubleSide // if some objects are planes or have backfaces
});


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
    document.getElementById('btn-remove-object').addEventListener('click', () => setEditorMode('removing_object'));
    
    sceneContainerElement.addEventListener('mousemove', onEditorMouseMove);
    sceneContainerElement.addEventListener('mousedown', onEditorMouseDown);
    
    setEditorMode('view');
}

function updateActiveButton() {
    document.querySelectorAll('#editor-ui button').forEach(btn => btn.classList.remove('active'));
    const modeButtonMap = {
        'view': 'btn-view-mode',
        'placing_island': 'btn-add-island',
        'placing_tree': 'btn-add-tree',
        'placing_rock': 'btn-add-rock',
        'removing_object': 'btn-remove-object'
    };
    if (modeButtonMap[editorMode]) {
        document.getElementById(modeButtonMap[editorMode]).classList.add('active');
    }
}

function setEditorMode(mode) {
    // Clear any previous highlight when changing mode
    clearHighlight();

    editorMode = mode;
    if(currentModeTextElement) {
        currentModeTextElement.textContent = mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    updateActiveButton();
    const isViewMode = (mode === 'view');
    setCameraControlsActive(isViewMode);

    if (ghostMesh) {
        currentScene.remove(ghostMesh);
        if (ghostMesh.geometry) ghostMesh.geometry.dispose();
        else ghostMesh.traverse(child => { if (child.isMesh && child.geometry) child.geometry.dispose();});
        ghostMesh = null;
    }
    
    let defaultCursor = 'default';
    if(sceneContainerElement) {
        defaultCursor = sceneContainerElement.getAttribute('data-default-cursor') || 'default';
        if (isViewMode) { // Store current cursor only if going to view mode
            sceneContainerElement.setAttribute('data-default-cursor', sceneContainerElement.style.cursor || defaultCursor);
        }
    }

    if (mode === 'placing_island') ghostMesh = createIslandGhostMesh();
    else if (mode === 'placing_tree') ghostMesh = createTreeGhostMesh();
    else if (mode === 'placing_rock') ghostMesh = createRockGhostMesh();
    // No ghost mesh for 'removing_object' mode

    if (ghostMesh) {
        ghostMesh.visible = false; 
        ghostMesh.userData = {}; 
        currentScene.add(ghostMesh);
        if (sceneContainerElement) sceneContainerElement.style.cursor = 'crosshair';
    } else { 
        if (sceneContainerElement) {
             if (isViewMode) sceneContainerElement.style.cursor = defaultCursor;
             else if (mode === 'removing_object') sceneContainerElement.style.cursor = 'pointer'; // Or a specific remove cursor
             else sceneContainerElement.style.cursor = defaultCursor; // Fallback
        }
    }
}

function onEditorMouseMove(event) {
    if (!sceneContainerElement || !currentCamera) return;

    const rect = sceneContainerElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, currentCamera);

    if (editorMode === 'view') {
        clearHighlight(); // Clear highlight if accidentally in view mode with a highlight
        return;
    }

    if (editorMode === 'removing_object') {
        handleRemoveHighlight();
        return; // No ghost mesh movement needed
    }

    // Logic for placement modes (placing_island, placing_tree, placing_rock)
    if (!ghostMesh) {
        if (highlightedObject) clearHighlight(); // Clear highlight if switching from remove to place
        return;
    }
    if (highlightedObject) clearHighlight(); // Clear highlight if mouse moves while in placement

    ghostMesh.visible = false; 
    if (ghostMesh.userData) ghostMesh.userData.canPlace = false;

    let intersects;
    if (editorMode === 'placing_island') {
        if (!placementPlaneRef) return;
        intersects = raycaster.intersectObject(placementPlaneRef);
        if (intersects.length > 0) {
            ghostMesh.visible = true;
            const intersectPoint = intersects[0].point;
            ghostMesh.position.set(intersectPoint.x, 0, intersectPoint.z);
            
            const currentGhostBB = new THREE.Box3().setFromObject(ghostMesh);
            let isColliding = false;
            for (const island of placedObjects.islands) {
                const islandWorldBB = new THREE.Box3();
                if (!island.userData.boundingBox) island.userData.boundingBox = new THREE.Box3().setFromObject(island);
                islandWorldBB.copy(island.userData.boundingBox).applyMatrix4(island.matrixWorld);
                if (currentGhostBB.intersectsBox(islandWorldBB)) {
                    isColliding = true;
                    break;
                }
            }
            const materialToUse = isColliding ? collisionGhostMaterial : ghostMaterial;
            ghostMesh.traverse(child => { if (child.isMesh) child.material = materialToUse; });
            ghostMesh.userData.canPlace = !isColliding;
        }
    } else if (editorMode === 'placing_tree' || editorMode === 'placing_rock') {
        const islandMeshes = [];
        placedObjects.islands.forEach(islandGroup => {
            if (islandGroup && islandGroup.traverse) {
                islandGroup.traverse(child => {
                    if (child.isMesh && child.userData && child.userData.isIslandPart) {
                        islandMeshes.push(child);
                    }
                });
            }
        });
        if (islandMeshes.length === 0) return;

        intersects = raycaster.intersectObjects(islandMeshes, false);
        if (intersects.length > 0) {
            ghostMesh.visible = true;
            const intersect = intersects[0];
            ghostMesh.position.copy(intersect.point);
            ghostMesh.userData.targetIsland = intersect.object.userData.parentIslandGroup;

            if (editorMode === 'placing_tree') {
                ghostMesh.position.y += 0.75;
                let canPlaceTree = true;
                if (ghostMesh.userData.targetIsland) {
                    const targetIsland = ghostMesh.userData.targetIsland;
                    const ghostTreeWorldPos = ghostMesh.position.clone();
                    for (const tree of placedObjects.trees) {
                        if (tree.parent === targetIsland) {
                            const existingTreeWorldPos = new THREE.Vector3();
                            tree.getWorldPosition(existingTreeWorldPos);
                            if (ghostTreeWorldPos.distanceTo(existingTreeWorldPos) < TREE_COLLISION_RADIUS * 2) {
                                canPlaceTree = false;
                                break;
                            }
                        }
                    }
                }
                ghostMesh.userData.canPlace = canPlaceTree;
                const materialToUse = canPlaceTree ? ghostMaterial : collisionGhostMaterial;
                ghostMesh.traverse(child => { if (child.isMesh) child.material = materialToUse; });
            } else { // placing_rock
                ghostMesh.position.y += 0.25;
                ghostMesh.userData.canPlace = true;
                ghostMesh.traverse(child => { if (child.isMesh) child.material = ghostMaterial; });
            }
        }
    }
}

function onEditorMouseDown(event) {
    if (event.button !== 0) return; // Only left click

    if (editorMode === 'removing_object') {
        if (highlightedObject) {
            removeObject(highlightedObject.object, highlightedObject.type);
            clearHighlight(); // Clear highlight after removal
        }
        return;
    }

    // Placement logic
    if (editorMode === 'view' || !ghostMesh || !ghostMesh.visible || !ghostMesh.userData || !ghostMesh.userData.canPlace) {
        return;
    }

    let newObject;
    const placementPosition = ghostMesh.position.clone(); 

    if (editorMode === 'placing_island') {
        newObject = createIslandInstance(placementPosition);
        currentScene.add(newObject);
        newObject.traverse(child => {
            if (child.isMesh) {
                child.userData.isIslandPart = true;
                child.userData.parentIslandGroup = newObject;
            }
        });
        if (!newObject.userData.boundingBox) newObject.userData.boundingBox = new THREE.Box3().setFromObject(newObject);
        placedObjects.islands.push(newObject);
    } else if (editorMode === 'placing_tree') {
        newObject = createTreeInstance(new THREE.Vector3());
        if (ghostMesh.userData.targetIsland) {
            const targetIsland = ghostMesh.userData.targetIsland;
            const localPosition = targetIsland.worldToLocal(placementPosition.clone());
            newObject.position.copy(localPosition);
            targetIsland.add(newObject);
            placedObjects.trees.push(newObject);
        } else { 
            newObject.position.copy(placementPosition);
            currentScene.add(newObject); 
        }
    } else if (editorMode === 'placing_rock') {
        newObject = createRockInstance(new THREE.Vector3());
         if (ghostMesh.userData.targetIsland) {
            const targetIsland = ghostMesh.userData.targetIsland;
            const localPosition = targetIsland.worldToLocal(placementPosition.clone());
            newObject.position.copy(localPosition);
            targetIsland.add(newObject);
            placedObjects.rocks.push(newObject);
        } else { 
            newObject.position.copy(placementPosition);
            currentScene.add(newObject); 
        }
    }
}

// --- Removal and Highlighting Logic ---
function handleRemoveHighlight() {
    const targets = [];
    // Gather all top-level meshes of placeable objects
    // For islands, we raycast against their main parts.
    // For trees/rocks, they are typically groups, so we'd raycast their main mesh.
    // This needs careful consideration of what is "selectable".
    // Let's try raycasting against all children of placedObjects that are meshes.
    placedObjects.islands.forEach(island => island.traverse(c => { if(c.isMesh) targets.push(c);}));
    placedObjects.trees.forEach(tree => tree.traverse(c => { if(c.isMesh) targets.push(c);})); // tree is a group
    placedObjects.rocks.forEach(rock => { if(rock.isMesh) targets.push(rock);}); // rock is a mesh

    if (targets.length === 0) {
        clearHighlight();
        return;
    }
    
    const intersects = raycaster.intersectObjects(targets, false); // false = don't check children if parent hit

    if (intersects.length > 0) {
        let intersectedObjectData = getPlaceableObjectFromIntersect(intersects[0].object);
        
        if (intersectedObjectData) {
            if (highlightedObject && highlightedObject.object === intersectedObjectData.object) {
                return; // Already highlighted
            }
            clearHighlight(); // Clear previous highlight
            highlightObject(intersectedObjectData.object, intersectedObjectData.type);
            highlightedObject = intersectedObjectData;
        } else {
            clearHighlight();
        }
    } else {
        clearHighlight();
    }
}

// Helper to find the top-level placeable group (Island, Tree group, Rock mesh) from an intersected mesh part
function getPlaceableObjectFromIntersect(intersectedMesh) {
    let current = intersectedMesh;
    while (current) {
        if (placedObjects.islands.includes(current)) return { object: current, type: 'island' };
        if (placedObjects.trees.includes(current)) return { object: current, type: 'tree' };
        if (placedObjects.rocks.includes(current)) return { object: current, type: 'rock' };
        current = current.parent;
    }
    return null; // Not a directly placeable object or part of one
}


function highlightObject(objectToHighlight, type) {
    // For groups (islands, trees), apply highlight to all children meshes
    // For single meshes (rocks), apply directly
    originalMaterials.clear(); // Clear previous session's materials

    objectToHighlight.traverse(child => {
        if (child.isMesh) {
            originalMaterials.set(child, child.material); // Store original material
            child.material = REMOVE_HIGHLIGHT_MATERIAL;
        }
    });
    highlightedObject = { object: objectToHighlight, type: type }; // Store ref and type
}

function clearHighlight() {
    if (highlightedObject && highlightedObject.object) {
        highlightedObject.object.traverse(child => {
            if (child.isMesh && originalMaterials.has(child)) {
                child.material = originalMaterials.get(child); // Restore original material
            }
        });
    }
    highlightedObject = null;
    originalMaterials.clear();
}

function removeObject(objectToRemove, type) {
    if (!objectToRemove) return;

    // Cascading delete for islands
    if (type === 'island') {
        // Find and remove all trees and rocks on this island
        const childrenToRemove = [];
        placedObjects.trees.forEach(tree => {
            if (tree.parent === objectToRemove) childrenToRemove.push({object: tree, type: 'tree'});
        });
        placedObjects.rocks.forEach(rock => {
            if (rock.parent === objectToRemove) childrenToRemove.push({object: rock, type: 'rock'});
        });
        childrenToRemove.forEach(childData => removeObject(childData.object, childData.type)); // Recursive call for children
    }

    // Remove from respective placedObjects array
    if (type === 'island') {
        placedObjects.islands = placedObjects.islands.filter(item => item !== objectToRemove);
    } else if (type === 'tree') {
        placedObjects.trees = placedObjects.trees.filter(item => item !== objectToRemove);
    } else if (type === 'rock') {
        placedObjects.rocks = placedObjects.rocks.filter(item => item !== objectToRemove);
    }

    // Remove from animation system
    removeAnimatedObjectByMesh(objectToRemove);

    // Remove from scene and dispose
    if (objectToRemove.parent) {
        objectToRemove.parent.remove(objectToRemove);
    } else {
        currentScene.remove(objectToRemove); // Should already be handled by parent.remove
    }

    // Dispose geometries and materials
    objectToRemove.traverse(child => {
        if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                // If material is an array
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    });

    console.log("Removed:", type, objectToRemove.name || 'Unnamed Object');
}
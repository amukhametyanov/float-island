// js/cameraControls.js
import * as THREE from 'three';
import { MOVE_SPEED, ROTATE_SPEED } from './config.js';

const keysPressed = {};
let cameraInstance = null;
let controlsActive = true;
let sceneContainerElement = null; // Store reference to the container

// Mouse look variables
let isRightMouseDown = false;
let previousMousePosition = { x: 0, y: 0 };
const orbitPoint = new THREE.Vector3(0, 2, 0); // Point to orbit around, adjust as needed
const MOUSE_LOOK_SENSITIVITY_X = 0.007;
const MOUSE_LOOK_SENSITIVITY_Y = 0.007;
const MIN_ORBIT_DISTANCE = 5;
const MAX_ORBIT_DISTANCE = 100;

// --- First-person camera hierarchy ---
let yawObject = null;
let pitchObject = null;


export function initCameraControls(camera, container) {
    cameraInstance = camera;
    sceneContainerElement = container;

    // Create yaw and pitch objects if not already created
    if (!yawObject) {
        yawObject = new THREE.Object3D();
        pitchObject = new THREE.Object3D();
        yawObject.add(pitchObject);
        // Move yawObject to the initial camera position
        yawObject.position.copy(camera.position);
        // Reset camera position to origin relative to pitchObject
        camera.position.set(0, 0, 0);
        // Remove camera from its parent if needed
        if (camera.parent) camera.parent.remove(camera);
        pitchObject.add(cameraInstance);
        // Add yawObject to the scene only if not already present
        if (window.scene && !window.scene.children.includes(yawObject)) {
            window.scene.add(yawObject);
        }
    }

    // Keyboard events on the container (or document/window if preferred)
    sceneContainerElement.addEventListener('keydown', onKeyDown);
    sceneContainerElement.addEventListener('keyup', onKeyUp);

    // Mouse events for orbit on the container
    sceneContainerElement.addEventListener('mousedown', onSceneMouseDown);
    document.addEventListener('mouseup', onSceneMouseUp); // Listen on document for mouseup
    document.addEventListener('mousemove', onSceneMouseMove); // Listen on document for mousemove
    sceneContainerElement.addEventListener('contextmenu', (event) => event.preventDefault()); // Prevent context menu on right click

    // Make container focusable for keyboard events
    sceneContainerElement.setAttribute('tabindex', '0');
    // sceneContainerElement.focus(); // Focus it initially - handled by editor mode now
}

function onKeyDown(event) {
    // Prevent camera movement with Q/E or PageUp/PageDown only if window._disableCameraVertical is true
    if (window._disableCameraVertical && (event.key.toLowerCase() === 'q' || event.key.toLowerCase() === 'e' || event.key === 'PageUp' || event.key === 'PageDown')) {
        event.preventDefault();
        return;
    }
    keysPressed[event.key.toLowerCase()] = true;
    if (controlsActive && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "s", "pageup", "pagedown"].includes(event.key.toLowerCase())) {
        event.preventDefault();
    }
}

function onKeyUp(event) {
    keysPressed[event.key.toLowerCase()] = false;
}

function onSceneMouseDown(event) {
    if (event.button === 2 && controlsActive) { // Right mouse button
        isRightMouseDown = true;
        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
        sceneContainerElement.style.cursor = 'grabbing'; // Indicate dragging
        event.preventDefault(); // Prevent context menu just in case
    }
}

function onSceneMouseUp(event) {
    if (event.button === 2) {
        isRightMouseDown = false;
        if (controlsActive) { // Only change cursor if controls were active
             sceneContainerElement.style.cursor = sceneContainerElement.getAttribute('data-default-cursor') || 'default';
        }
    }
}

function onSceneMouseMove(event) {
    if (!isRightMouseDown || !controlsActive || !cameraInstance) {
        return;
    }

    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    // Use yawObject for left/right, pitchObject for up/down
    const yaw = -deltaX * 0.012;
    const pitch = -deltaY * 0.012;

    if (yawObject && pitchObject) {
        yawObject.rotation.y += yaw;
        // Clamp pitch
        const minPitch = -Math.PI / 2 + 0.15;
        const maxPitch = Math.PI / 2 - 0.15;
        pitchObject.rotation.x = Math.max(minPitch, Math.min(maxPitch, pitchObject.rotation.x + pitch));
    }

    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
}


export function setCameraControlsActive(isActive) {
    controlsActive = isActive;
    if (isActive) {
        if (sceneContainerElement) sceneContainerElement.focus(); // Focus when becoming active
    } else {
        isRightMouseDown = false; // Ensure mouse look stops if mode changes
        // Reset cursor if it was changed by mouse look
        if (sceneContainerElement) {
            sceneContainerElement.style.cursor = sceneContainerElement.getAttribute('data-default-cursor') || 'default';
        }
    }
}

export function updateCamera(delta) {
    if (!controlsActive || !cameraInstance) return;

    const moveDistance = MOVE_SPEED * delta;

    // Calculate movement directions based on yawObject (so movement is always flat relative to ground)
    let forward = new THREE.Vector3(0, 0, -1); // Z- axis in Three.js
    let right = new THREE.Vector3(1, 0, 0);    // X+ axis in Three.js
    if (yawObject) {
        // Transform directions by yawObject's rotation (ignoring pitch)
        forward.applyQuaternion(yawObject.quaternion);
        right.applyQuaternion(yawObject.quaternion);
    }

    // Zero out Y for flat movement
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    // Forward / Backward
    if (keysPressed['arrowup'] || keysPressed['w']) {
        yawObject.position.add(forward.clone().multiplyScalar(moveDistance));
    }
    if (keysPressed['arrowdown'] || keysPressed['s']) {
        yawObject.position.add(forward.clone().multiplyScalar(-moveDistance));
    }

    // Strafing Left / Right
    if (keysPressed['arrowleft'] || keysPressed['a']) {
        yawObject.position.add(right.clone().multiplyScalar(-moveDistance));
    }
    if (keysPressed['arrowright'] || keysPressed['d']) {
        yawObject.position.add(right.clone().multiplyScalar(moveDistance));
    }

    // Up / Down (world Y axis)
    if (!window._disableCameraVertical && (keysPressed['pageup'] || keysPressed['q'])) {
        yawObject.position.y += moveDistance;
    }
    if (!window._disableCameraVertical && (keysPressed['pagedown'] || keysPressed['e'])) {
        yawObject.position.y -= moveDistance;
    }
}
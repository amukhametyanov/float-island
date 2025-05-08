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


export function initCameraControls(camera, container) {
    cameraInstance = camera;
    sceneContainerElement = container; // Store for mouse events

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

    // --- Simple Orbit Logic ---
    // Get current vector from orbitPoint to camera
    const offset = new THREE.Vector3().subVectors(cameraInstance.position, orbitPoint);

    // Horizontal rotation (around world Y-axis, or camera's local Y if preferred for FPS style)
    const theta = -deltaX * MOUSE_LOOK_SENSITIVITY_X;
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), theta);

    // Vertical rotation (around camera's local X-axis to avoid gimbal issues with world X)
    // Need to get camera's right vector for axis of rotation
    const phi = -deltaY * MOUSE_LOOK_SENSITIVITY_Y;
    const cameraRight = new THREE.Vector3();
    cameraInstance.getWorldDirection(cameraRight); // Gets forward vector
    cameraRight.cross(cameraInstance.up); // Cross with up to get right vector
    cameraRight.normalize();
    
    // Check to prevent flipping over the top/bottom
    const currentAngleWithY = offset.angleTo(new THREE.Vector3(0,1,0));
    const maxAngle = Math.PI - 0.1; //  don't go straight up/down
    const minAngle = 0.1;

    if ((phi > 0 && currentAngleWithY + phi < maxAngle) || (phi < 0 && currentAngleWithY + phi > minAngle)) {
         offset.applyAxisAngle(cameraRight, phi);
    }


    // Apply new offset to orbitPoint to get new camera position
    cameraInstance.position.copy(orbitPoint).add(offset);

    // Ensure camera always looks at the orbit point
    cameraInstance.lookAt(orbitPoint);

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

    // Arrow Key / WASD Movement (Perspective Shift)
    const moveDistance = MOVE_SPEED * delta;
    const direction = new THREE.Vector3();
    cameraInstance.getWorldDirection(direction); // Gets the Z-axis direction camera is facing

    // Forward / Backward (changes camera position and orbit point)
    if (keysPressed['arrowup'] || keysPressed['w']) {
        const moveVector = direction.clone().multiplyScalar(moveDistance);
        cameraInstance.position.add(moveVector);
        orbitPoint.add(moveVector); // Move the orbit point with the camera
    }
    if (keysPressed['arrowdown'] || keysPressed['s']) {
        const moveVector = direction.clone().multiplyScalar(-moveDistance);
        cameraInstance.position.add(moveVector);
        orbitPoint.add(moveVector);
    }

    // Strafing (Left / Right - changes camera position and orbit point)
    const strafeDirection = new THREE.Vector3();
    strafeDirection.crossVectors(cameraInstance.up, direction).normalize(); // Get right vector (inverted for left)

    if (keysPressed['arrowleft']) { // Assuming arrow left/right for strafe now
        const moveVector = strafeDirection.clone().multiplyScalar(moveDistance);
        cameraInstance.position.add(moveVector);
        orbitPoint.add(moveVector);
    }
    if (keysPressed['arrowright']) {
        const moveVector = strafeDirection.clone().multiplyScalar(-moveDistance);
        cameraInstance.position.add(moveVector);
        orbitPoint.add(moveVector);
    }
    
    // Up / Down (World Y-axis - changes camera position and orbit point)
    if (keysPressed['pageup']) {
        cameraInstance.position.y += moveDistance;
        orbitPoint.y += moveDistance;
    }
    if (keysPressed['pagedown']) {
        cameraInstance.position.y -= moveDistance;
        orbitPoint.y -= moveDistance;
    }

    // Note: Simple yaw rotation with arrow keys is removed in favor of mouse orbit.
    // If you still want arrow key yaw, you'd re-add:
    // if (keysPressed['q']) cameraInstance.rotateY(rotateAngle); // Example 'q'
    // if (keysPressed['e']) cameraInstance.rotateY(-rotateAngle); // Example 'e'
    // But this conflicts with orbitPoint logic unless orbitPoint is also rotated or camera detaches.
}
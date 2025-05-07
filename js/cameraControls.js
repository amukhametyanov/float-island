// js/cameraControls.js
import { MOVE_SPEED, ROTATE_SPEED } from './config.js';

const keysPressed = {};
let cameraInstance = null; // To store the camera reference
let controlsActive = true;

export function initCameraControls(camera, sceneContainer) {
    cameraInstance = camera;
    sceneContainer.addEventListener('keydown', onKeyDown); // Listen on container for focus
    sceneContainer.addEventListener('keyup', onKeyUp);
    // Make container focusable
    sceneContainer.setAttribute('tabindex', '0'); 
    sceneContainer.focus(); // Focus it initially
}

function onKeyDown(event) {
    keysPressed[event.key.toLowerCase()] = true;
    // Prevent default only if controls are active and it's a relevant key
    if (controlsActive && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "s", "pageup", "pagedown"].includes(event.key.toLowerCase())) {
        event.preventDefault();
    }
}

function onKeyUp(event) {
    keysPressed[event.key.toLowerCase()] = false;
}

export function setCameraControlsActive(isActive) {
    controlsActive = isActive;
}

export function updateCamera(delta) {
    if (!controlsActive || !cameraInstance) return;

    const moveDistance = MOVE_SPEED * delta;
    const rotateAngle = ROTATE_SPEED * delta;

    if (keysPressed['arrowup'] || keysPressed['w']) {
        cameraInstance.translateZ(-moveDistance);
    }
    if (keysPressed['arrowdown'] || keysPressed['s']) {
        cameraInstance.translateZ(moveDistance);
    }
    if (keysPressed['arrowleft']) {
        cameraInstance.rotateY(rotateAngle);
    }
    if (keysPressed['arrowright']) {
        cameraInstance.rotateY(-rotateAngle);
    }
    if (keysPressed['pageup']) { // Using pageup/pagedown for up/down
        cameraInstance.position.y += moveDistance;
    }
    if (keysPressed['pagedown']) {
        cameraInstance.position.y -= moveDistance;
    }
}
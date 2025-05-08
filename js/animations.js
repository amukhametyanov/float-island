// js/animations.js
import * as THREE from 'three'; // Needed for Vector3 for bounding box updates

export const animatedObjects = []; // Array to store objects that need animation

export function addAnimatedObject(mesh, type, params = {}) {
    animatedObjects.push({ mesh, type, ...params });
}

export function removeAnimatedObjectByMesh(meshToRemove) {
    // Remove the main mesh if it's directly in animatedObjects
    const mainIndex = animatedObjects.findIndex(objData => objData.mesh === meshToRemove);
    if (mainIndex > -1) {
        animatedObjects.splice(mainIndex, 1);
    }

    // Also, iterate and remove any children of this mesh that might have been added separately
    // This is important for composite objects like islands with animated crystals
    if (meshToRemove.children && meshToRemove.children.length > 0) {
        meshToRemove.traverse(child => {
            const childIndex = animatedObjects.findIndex(objData => objData.mesh === child);
            if (childIndex > -1) {
                animatedObjects.splice(childIndex, 1);
            }
        });
    }
}

export function updateAnimations(delta, elapsedTime) {
    for (let i = animatedObjects.length - 1; i >= 0; i--) {
        const objData = animatedObjects[i];
        const obj = objData.mesh;

        if (!obj || !obj.parent) {
            animatedObjects.splice(i, 1);
            continue;
        }

        try {
            switch (objData.type) {
                // ... (island_bob, tree_sway, crystal_glow cases as before) ...
                case 'cloud_drift':
                    obj.position.x += objData.speed * delta * 10; // Increase speed factor for visibility

                    const xRange = obj.userData.xRange || 120; // Default if not set
                    const yRange = obj.userData.yRange || 10;
                    const yBase = obj.userData.yBase || 15;
                    const zRange = obj.userData.zRange || 80;
                    const zOffset = obj.userData.zOffset || -30;
                    const buffer = 20; // How far off screen before recycling

                    // Check if cloud is too far left or right
                    if (objData.speed > 0 && obj.position.x > xRange / 2 + buffer) { // Moving right, went too far right
                        obj.position.x = -xRange / 2 - Math.random() * buffer; // Recycle to the far left
                        // Re-randomize Y and Z and potentially appearance
                        obj.position.y = Math.random() * yRange + yBase;
                        obj.position.z = (Math.random() - 0.5) * zRange + zOffset;
                        // Optionally: objData.speed = (Math.random() * 0.2 + 0.05); // New speed (always positive for this side)
                        // Optionally: Re-create puffs for more variety (more complex)
                    } else if (objData.speed < 0 && obj.position.x < -xRange / 2 - buffer) { // Moving left, went too far left
                        obj.position.x = xRange / 2 + Math.random() * buffer; // Recycle to the far right
                        // Re-randomize Y and Z
                        obj.position.y = Math.random() * yRange + yBase;
                        obj.position.z = (Math.random() - 0.5) * zRange + zOffset;
                        // Optionally: objData.speed = -(Math.random() * 0.2 + 0.05); // New speed (always negative for this side)
                    }
                    break;
            }
        } catch (error) {
            console.error("Error animating object:", objData.type, obj.name, error);
            animatedObjects.splice(i, 1);
        }
    }
}

export function updateLightAnimation(light, elapsedTime) {
    if (light) {
        light.position.x = Math.sin(elapsedTime * 0.2) * 20;
        light.position.z = Math.cos(elapsedTime * 0.2) * 20;
    }
}
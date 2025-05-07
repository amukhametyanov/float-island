// js/animations.js
import * as THREE from 'three'; // Needed for Vector3 for bounding box updates

export const animatedObjects = []; // Array to store objects that need animation

export function addAnimatedObject(mesh, type, params = {}) {
    animatedObjects.push({ mesh, type, ...params });
}

export function updateAnimations(delta, elapsedTime) {
    animatedObjects.forEach(objData => {
        const obj = objData.mesh;
        if (!obj || !obj.parent) { // Skip if object is removed or has no parent
             // Optional: remove from animatedObjects if obj.parent is null
            return;
        }

        try {
            switch (objData.type) {
                case 'island_bob':
                    if (obj.parent && obj.parent.type === 'Scene') { // Only bob top-level islands
                        obj.position.y = objData.initialY + Math.sin(elapsedTime * objData.bobSpeed) * objData.bobAmount;
                        if (obj.userData.boundingBox) {
                            // Re-center the bounding box correctly after position change
                            const center = new THREE.Vector3();
                            obj.userData.boundingBox.getCenter(center);
                            const offset = obj.position.clone().sub(center);
                            obj.userData.boundingBox.translate(offset);
                        }
                    }
                    break;
                case 'tree_sway':
                    if (obj.material) { // Assuming canopy is the objData.mesh
                        obj.rotation.z = objData.initialRotation.z + Math.sin(elapsedTime * objData.swaySpeed) * objData.swayAmount;
                        obj.rotation.x = objData.initialRotation.x + Math.cos(elapsedTime * objData.swaySpeed * 0.7) * objData.swayAmount * 0.5;
                    }
                    break;
                case 'crystal_glow':
                    if (obj.material && obj.material.emissiveIntensity !== undefined) {
                        obj.material.emissiveIntensity = 0.4 + Math.sin(elapsedTime * 1.5) * 0.2;
                    }
                    break;
                case 'cloud_drift':
                    obj.position.x += objData.speed * delta;
                    if (obj.position.x > 50) {
                        obj.position.x = -50;
                        obj.position.z = objData.initialZ + (Math.random() - 0.5) * 10;
                    }
                    break;
            }
        } catch (error) {
            console.error("Error animating object:", objData, error);
            // Optional: remove problematic object from animation list
            // animatedObjects.splice(animatedObjects.indexOf(objData), 1);
        }
    });
}

export function updateLightAnimation(light, elapsedTime) {
    if (light) {
        light.position.x = Math.sin(elapsedTime * 0.2) * 20;
        light.position.z = Math.cos(elapsedTime * 0.2) * 20;
    }
}
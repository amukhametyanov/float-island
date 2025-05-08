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
    // Filter out objects whose mesh might have been removed from scene elsewhere
    // Though ideally, removeAnimatedObjectByMesh handles this.
    const validAnimatedObjects = animatedObjects.filter(objData => objData.mesh && objData.mesh.parent);
    
    // Replace animatedObjects with the filtered list if you want to auto-clean,
    // but explicit removal via removeAnimatedObjectByMesh is safer.
    // if (validAnimatedObjects.length !== animatedObjects.length) {
    //    animatedObjects.length = 0; // Clear array
    //    animatedObjects.push(...validAnimatedObjects); // Repopulate
    // }


    for (let i = animatedObjects.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
        const objData = animatedObjects[i];
        const obj = objData.mesh;

        if (!obj || !obj.parent) { // If object was removed from scene or doesn't exist
            animatedObjects.splice(i, 1); // Remove from animations array
            continue;
        }

        try {
            switch (objData.type) {
                case 'island_bob':
                    // Ensure it's a top-level island in the scene (not a child of another temp group)
                    if (obj.parent && obj.parent.type === 'Scene') {
                        obj.position.y = objData.initialY + Math.sin(elapsedTime * objData.bobSpeed) * objData.bobAmount;
                        // Bounding box update logic (if still needed after object is static during placement)
                        // if (obj.userData.boundingBox) {
                        //     const center = new THREE.Vector3();
                        //     obj.userData.boundingBox.getCenter(center);
                        //     const offset = obj.position.clone().sub(center);
                        //     obj.userData.boundingBox.translate(offset);
                        // }
                    }
                    break;
                case 'tree_sway':
                    if (obj.material) {
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
                    if (obj.position.x > 60) { // Wider reset range for clouds
                        obj.position.x = -60;
                        obj.position.z = objData.initialZ + (Math.random() - 0.5) * 20;
                    }
                    break;
            }
        } catch (error) {
            console.error("Error animating object:", objData.type, obj.name, error);
            animatedObjects.splice(i, 1); // Remove problematic object
        }
    }
}

export function updateLightAnimation(light, elapsedTime) {
    if (light) {
        light.position.x = Math.sin(elapsedTime * 0.2) * 20;
        light.position.z = Math.cos(elapsedTime * 0.2) * 20;
    }
}
// js/objectFactory.js
import * as THREE from 'three';
import {
    grassMaterial, rockEarthMaterial, crystalMaterial, trunkMaterial, leavesMaterial,
    simpleRockMaterial, cloudMaterial, ghostMaterial
} from './config.js';
import { addAnimatedObject } from './animations.js';


export function createIslandInstance(position) {
    const islandGroup = new THREE.Group();
    islandGroup.position.copy(position);

    const topGeometry = new THREE.CylinderGeometry(5, 4.5, 2, 8, 1);
    const islandTop = new THREE.Mesh(topGeometry, grassMaterial.clone());
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
    
    // Remove crystal creation
    // const crystalGeom = new THREE.IcosahedronGeometry(0.8, 0);
    // const crystal = new THREE.Mesh(crystalGeom, crystalMaterial.clone());
    // crystal.position.set(0, 1.5, 0);
    // crystal.castShadow = true;
    // crystal.name = "IslandCrystal";
    // islandGroup.add(crystal);
    // addAnimatedObject(crystal, 'crystal_glow');

    islandGroup.userData.boundingBox = new THREE.Box3().setFromObject(islandGroup);
    addAnimatedObject(islandGroup, 'island_bob', { initialY: islandGroup.position.y, bobSpeed: 0.4 + Math.random() * 0.2, bobAmount: 0.15 + Math.random() * 0.1 });
    return islandGroup;
}

export function createTreeInstance(position, rotationY = 0) {
    const treeGroup = new THREE.Group();
    treeGroup.position.copy(position);
    treeGroup.rotation.y = rotationY;

    const trunkHeight = Math.random() * 1 + 1;
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 5);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial.clone());
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    const canopyRadius = Math.random() * 0.5 + 0.8;
    const canopyGeometry = new THREE.IcosahedronGeometry(canopyRadius, 0);
    const canopy = new THREE.Mesh(canopyGeometry, leavesMaterial.clone());
    canopy.position.y = trunkHeight / 2 + canopyRadius * 0.7;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    treeGroup.add(canopy);
    addAnimatedObject(canopy, 'tree_sway', { initialRotation: canopy.rotation.clone(), swaySpeed: Math.random() * 0.5 + 0.2, swayAmount: Math.random() * 0.05 + 0.02 });
    return treeGroup;
}

export function createRockInstance(position) {
    const rockSize = Math.random() * 0.4 + 0.3;
    const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0); 
    const rock = new THREE.Mesh(rockGeometry, simpleRockMaterial.clone());
    rock.position.copy(position);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
}

export function createCloudGroup(isInitial = true, xRange = 120, yRange = 10, yBase = 15, zRange = 80, zOffset = -30) {
    const cloudGroup = new THREE.Group();
    const numPuffs = Math.floor(Math.random() * 4) + 4; // 4 to 7 puffs
    for (let j = 0; j < numPuffs; j++) {
        const puffRadius = Math.random() * 1.5 + 1.0; // Slightly larger puffs
        const puffGeometry = new THREE.IcosahedronGeometry(puffRadius, 0);
        // Each cloud instance should get its own material instance if we want to animate opacity individually later
        const puff = new THREE.Mesh(puffGeometry, cloudMaterial.clone()); 
        puff.position.set(
            (Math.random() - 0.5) * 4, // Spread puffs horizontally within the cloud
            (Math.random() - 0.5) * 1.5, // Spread puffs vertically slightly
            (Math.random() - 0.5) * 3  // Spread puffs in depth slightly
        );
        puff.castShadow = true; // Soft shadows from clouds can be nice
        cloudGroup.add(puff);
    }
    
    if (isInitial) {
        // Spread initial clouds across the xRange
        cloudGroup.position.set(
            (Math.random() - 0.5) * xRange, 
            Math.random() * yRange + yBase,      
            (Math.random() - 0.5) * zRange + zOffset
        );
    } else {
        // For recycled clouds, start them off-screen on the right
        cloudGroup.position.set(
            xRange / 2 + Math.random() * 10, // Start just off-screen right + some variation
            Math.random() * yRange + yBase,      
            (Math.random() - 0.5) * zRange + zOffset 
        );
    }
    
    // Store ranges for recycling
    cloudGroup.userData.xRange = xRange;
    cloudGroup.userData.yRange = yRange;
    cloudGroup.userData.yBase = yBase;
    cloudGroup.userData.zRange = zRange;
    cloudGroup.userData.zOffset = zOffset;

    addAnimatedObject(cloudGroup, 'cloud_drift', { 
        speed: (Math.random() * 0.2 + 0.05) * (Math.random() < 0.5 ? 1 : -1) // Random speed and direction
    });
    return cloudGroup;
}

// --- Ghost Object Creation ---
export function createIslandGhostMesh() {
    const group = new THREE.Group();
    const topGeom = new THREE.CylinderGeometry(5, 4.5, 2, 8, 1);
    const bottomGeom = new THREE.ConeGeometry(4.5, 4, 8, 3);
    const topMesh = new THREE.Mesh(topGeom, ghostMaterial);
    topMesh.position.y = 0;
    const bottomMesh = new THREE.Mesh(bottomGeom, ghostMaterial);
    bottomMesh.position.y = -3;
    bottomMesh.rotation.x = Math.PI;
    group.add(topMesh, bottomMesh);
    return group;
}

export function createTreeGhostMesh() {
    const group = new THREE.Group();
    const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 5);
    const canopyGeom = new THREE.IcosahedronGeometry(1, 0);
    const trunkMesh = new THREE.Mesh(trunkGeom, ghostMaterial);
    const canopyMesh = new THREE.Mesh(canopyGeom, ghostMaterial);
    canopyMesh.position.y = 1.5 / 2 + 1 * 0.7;
    group.add(trunkMesh, canopyMesh);
    return group;
}

export function createRockGhostMesh() {
    const rockGeom = new THREE.DodecahedronGeometry(0.5, 0);
    return new THREE.Mesh(rockGeom, ghostMaterial);
}
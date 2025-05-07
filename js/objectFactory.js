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
    
    const crystalGeom = new THREE.IcosahedronGeometry(0.8, 0);
    const crystal = new THREE.Mesh(crystalGeom, crystalMaterial.clone());
    crystal.position.set(0, 1.5, 0);
    crystal.castShadow = true;
    crystal.name = "IslandCrystal";
    islandGroup.add(crystal);
    addAnimatedObject(crystal, 'crystal_glow');

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

export function createCloudGroup() {
    const cloudGroup = new THREE.Group();
    const numPuffs = Math.floor(Math.random() * 3) + 3;
    for (let j = 0; j < numPuffs; j++) {
        const puffRadius = Math.random() * 1 + 0.8;
        const puffGeometry = new THREE.IcosahedronGeometry(puffRadius, 0);
        const puff = new THREE.Mesh(puffGeometry, cloudMaterial.clone()); // Clone material
        puff.position.set(
            (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 2
        );
        puff.castShadow = true;
        cloudGroup.add(puff);
    }
    cloudGroup.position.set(
        (Math.random() - 0.5) * 60, Math.random() * 8 + 12, (Math.random() - 0.5) * 50 - 20
    );
    addAnimatedObject(cloudGroup, 'cloud_drift', { speed: Math.random() * 0.3 + 0.1, initialX: cloudGroup.position.x, initialZ: cloudGroup.position.z});
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
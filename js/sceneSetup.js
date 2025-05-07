// js/sceneSetup.js
import * as THREE from 'three';
import { FOG_COLOR, FOG_NEAR, FOG_FAR } from './config.js';

let scene, camera, renderer, directionalLight, placementPlane;

export function initSceneAndCamera() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 20);
    camera.lookAt(0, 0, 0);

    return { scene, camera };
}

export function initRenderer(container) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    return renderer;
}

export function initLights(targetScene) {
    const ambientLight = new THREE.AmbientLight(0xAAAAFF, 0.8);
    targetScene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xFFE4B5, 2);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    targetScene.add(directionalLight);
    return directionalLight;
}

export function createPlacementPlane(targetScene) {
    const planeGeometry = new THREE.PlaneGeometry(200, 200);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    placementPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    placementPlane.rotation.x = -Math.PI / 2;
    placementPlane.position.y = -0.1;
    placementPlane.name = "PlacementPlane";
    targetScene.add(placementPlane);
    return placementPlane;
}

export function onWindowResize(_camera, _renderer) {
    _camera.aspect = window.innerWidth / window.innerHeight;
    _camera.updateProjectionMatrix();
    _renderer.setSize(window.innerWidth, window.innerHeight);
}
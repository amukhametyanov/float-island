// js/config.js
import * as THREE from 'three';

// --- Speeds & Controls ---
export const MOVE_SPEED = 12; // Increased from 5 to 12 for faster navigation
export const ROTATE_SPEED = 1.5;

// --- Materials ---
export const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x66BB6A, flatShading: true, roughness: 0.8, metalness: 0.1 });
export const rockEarthMaterial = new THREE.MeshStandardMaterial({ color: 0x8D6E63, flatShading: true, roughness: 0.9, metalness: 0.0 });
export const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0xAFEEEE, emissive: 0xAFEEEE, emissiveIntensity: 0.5, flatShading: true, roughness: 0.3, metalness: 0.2 });
export const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x795548, flatShading: true, roughness: 0.8 });
export const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50, flatShading: true, roughness: 0.8 });
export const simpleRockMaterial = new THREE.MeshStandardMaterial({ color: 0x9E9E9E, flatShading: true, roughness: 0.9 });
export const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, flatShading: true, opacity: 0.85, transparent: true, roughness: 0.9 });

export const ghostMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500, transparent: true, opacity: 0.6, flatShading: true, side: THREE.DoubleSide });
export const collisionGhostMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.7, flatShading: true, side: THREE.DoubleSide });

// --- Fog ---
export const FOG_COLOR = 0xADD8E6;
export const FOG_NEAR = 10;
export const FOG_FAR = 80;

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  camera.position.set(0, 3.5, 4.5);

  return camera;
}

export function createCameraControls(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): OrbitControls {
  const controls = new OrbitControls(
    camera,
    renderer.domElement
  );

  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.minDistance = 1.5;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 2.05;

  controls.update();

  return controls;
}

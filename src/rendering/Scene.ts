
import * as THREE from 'three';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x202630);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    2.5
  );

  directionalLight.position.set(2, 6, 3);
  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.set(2048, 2048);
  directionalLight.shadow.camera.left = -4;
  directionalLight.shadow.camera.right = 4;
  directionalLight.shadow.camera.top = 4;
  directionalLight.shadow.camera.bottom = -4;

  scene.add(directionalLight);

  return scene;
}

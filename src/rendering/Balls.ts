
import * as THREE from 'three';

import { BALL_RADIUS } from '../game/TableConfig';
import { createRack } from '../game/Rack';
import { createBallMaterial } from './BallMaterials';

export function createBalls(): THREE.Group {
  const balls = new THREE.Group();

  // Одна геометрия для всех шаров.
  const geometry = new THREE.SphereGeometry(
    BALL_RADIUS,
    32,
    24
  );

  function createBall(
    number: number,
    x: number,
    z: number
  ): void {
    const material = createBallMaterial(number);

    const ball = new THREE.Mesh(
      geometry,
      material
    );

    ball.position.set(x, BALL_RADIUS, z);

    ball.castShadow = true;
    ball.receiveShadow = true;

    // Номер используют физика, правила и бот.
    ball.userData.ballNumber = number;

    balls.add(ball);
  }

  // Белый биток.
  createBall(0, -0.65, 0);

  // Случайная допустимая пирамида.
  const rack = createRack();

  const spacing = BALL_RADIUS * 2 + 0.0005;

  const rowSpacing =
    spacing * Math.sqrt(3) / 2;

  const startX = 0.57;

  for (let row = 0; row < rack.length; row++) {
    const numbers = rack[row];

    for (let i = 0; i < numbers.length; i++) {
      const x = startX + row * rowSpacing;

      const z =
        (i - (numbers.length - 1) / 2) * spacing;

      createBall(numbers[i], x, z);
    }
  }

  return balls;
}

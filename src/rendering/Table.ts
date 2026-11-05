
import * as THREE from 'three';

import {
  TABLE_LENGTH,
  TABLE_WIDTH,
  CORNER_POCKET_RADIUS,
  SIDE_POCKET_RADIUS,
  POCKETS,
  RAILS,
} from '../game/TableConfig';

// Сохраняем совместимость с Balls.ts
export {
  TABLE_LENGTH,
  TABLE_WIDTH,
  BALL_RADIUS,
  FELT_HEIGHT,
} from '../game/TableConfig';

export function createTable(): THREE.Group {
  const table = new THREE.Group();

  const halfL = TABLE_LENGTH / 2;
  const halfW = TABLE_WIDTH / 2;

  // Материалы
  const feltMaterial = new THREE.MeshStandardMaterial({
    color: 0x176b43,
    roughness: 0.95,
    side: THREE.DoubleSide,
  });

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x63391d,
    roughness: 0.6,
  });

  const cushionMaterial = new THREE.MeshStandardMaterial({
    color: 0x10482c,
    roughness: 0.9,
  });

  const pocketMaterial = new THREE.MeshStandardMaterial({
    color: 0x101010,
    roughness: 1,
    side: THREE.DoubleSide,
  });

  // -----------------------------------------
  // 1. Поверхность сукна с вырезами
  // -----------------------------------------

  const shape = new THREE.Shape();

  const c = CORNER_POCKET_RADIUS;
  const s = SIDE_POCKET_RADIUS;

  function addArc(
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    segments = 20
  ): void {
    for (let i = 1; i <= segments; i++) {
      const angle =
        startAngle +
        (endAngle - startAngle) * (i / segments);

      shape.lineTo(
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius
      );
    }
  }

  shape.moveTo(-halfL + c, -halfW);
  shape.lineTo(-s, -halfW);

  // Нижняя средняя луза
  addArc(0, -halfW, s, Math.PI, 0);

  shape.lineTo(halfL - c, -halfW);

  // Правая нижняя угловая луза
  addArc(halfL, -halfW, c, Math.PI, Math.PI / 2);

  shape.lineTo(halfL, halfW - c);

  // Правая верхняя угловая луза
  addArc(halfL, halfW, c, -Math.PI / 2, -Math.PI);

  shape.lineTo(s, halfW);

  // Верхняя средняя луза
  addArc(0, halfW, s, 0, -Math.PI);

  shape.lineTo(-halfL + c, halfW);

  // Левая верхняя угловая луза
  addArc(-halfL, halfW, c, 0, -Math.PI / 2);

  shape.lineTo(-halfL, -halfW + c);

  // Левая нижняя угловая луза
  addArc(-halfL, -halfW, c, Math.PI / 2, 0);

  shape.closePath();

  const surface = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    feltMaterial
  );

  surface.rotation.x = -Math.PI / 2;
  surface.receiveShadow = true;

  table.add(surface);

  // -----------------------------------------
  // 2. Резиновые борта
  // -----------------------------------------

  // Все координаты берём из TableConfig.ts
  for (const rail of RAILS) {
    const cushion = new THREE.Mesh(
      new THREE.BoxGeometry(
        rail.width,
        rail.height,
        rail.depth
      ),
      cushionMaterial
    );

    cushion.position.set(
      rail.x,
      rail.y,
      rail.z
    );

    cushion.castShadow = true;
    cushion.receiveShadow = true;

    table.add(cushion);
  }

  // -----------------------------------------
  // 3. Деревянное обрамление бортов
  // -----------------------------------------

  for (const rail of RAILS) {
    const alongX = rail.width > rail.depth;

    const width = alongX ? rail.width : 0.11;
    const depth = alongX ? 0.11 : rail.depth;

    const wood = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.12, depth),
      woodMaterial
    );

    // Дерево находится снаружи от резины
    let x = rail.x;
    let z = rail.z;

    if (alongX) {
      z += Math.sign(z) * 0.043;
    } else {
      x += Math.sign(x) * 0.043;
    }

    wood.position.set(x, 0.055, z);
    wood.castShadow = true;
    wood.receiveShadow = true;

    table.add(wood);
  }

  // -----------------------------------------
  // 4. Карманы шести луз
  // -----------------------------------------

  for (const pocket of POCKETS) {
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(
        pocket.radius,
        pocket.radius * 0.85,
        0.16,
        32,
        1,
        true
      ),
      pocketMaterial
    );

    wall.position.set(
      pocket.x,
      -0.08,
      pocket.z
    );

    table.add(wall);

    const bottom = new THREE.Mesh(
      new THREE.CircleGeometry(
        pocket.radius * 0.85,
        32
      ),
      pocketMaterial
    );

    bottom.rotation.x = -Math.PI / 2;

    bottom.position.set(
      pocket.x,
      -0.16,
      pocket.z
    );

    table.add(bottom);
  }

  return table;
}

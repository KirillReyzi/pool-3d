
import * as THREE from 'three';

const BALL_COLORS: Record<number, number> = {
  1: 0xf1ce32,
  2: 0x2455b8,
  3: 0xc52d32,
  4: 0x693ba0,
  5: 0xe87923,
  6: 0x23804a,
  7: 0x81312a,
  8: 0x111111,
  9: 0xf1ce32,
  10: 0x2455b8,
  11: 0xc52d32,
  12: 0x693ba0,
  13: 0xe87923,
  14: 0x23804a,
  15: 0x81312a,
};

/**
 * Создаёт текстуру шара с номером.
 *
 * Номера находятся на противоположных
 * сторонах экватора сферы.
 */
function createNumberedTexture(
  number: number,
  color: number,
  striped: boolean
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');

  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D недоступен');
  }

  const hexColor =
    `#${new THREE.Color(color).getHexString()}`;

  // -----------------------------
  // 1. Основной цвет
  // -----------------------------

  ctx.fillStyle = striped
    ? '#f8f8f5'
    : hexColor;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  // -----------------------------
  // 2. Полоса (№9–15)
  // -----------------------------

  if (striped) {
    ctx.fillStyle = hexColor;

    // Горизонтальная полоса по экватору.
    ctx.fillRect(
      0,
      160,
      canvas.width,
      192
    );
  }

  // -----------------------------
  // 3. Два номера напротив друг друга
  // -----------------------------

  const numberCenters = [
    canvas.width * 0.25,
    canvas.width * 0.75,
  ];

  const centerY = canvas.height / 2;

  for (const centerX of numberCenters) {
    // Белый круг под номером.
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      62,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Тонкая граница белого круга.
    ctx.strokeStyle = '#d9d9d9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Чёрный номер.
    ctx.fillStyle = '#151515';

    ctx.font = number >= 10
      ? 'bold 56px Arial'
      : 'bold 70px Arial';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
      String(number),
      centerX,
      centerY + 2
    );
  }

  // -----------------------------
  // 4. Текстура Three.js
  // -----------------------------

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  texture.anisotropy = 4;
  texture.needsUpdate = true;

  return texture;
}

/**
 * Создаёт материал по номеру шара.
 */
export function createBallMaterial(
  number: number
): THREE.MeshStandardMaterial {
  // Белый биток без номера.
  if (number === 0) {
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0,
    });
  }

  const color = BALL_COLORS[number];

  if (color === undefined) {
    throw new Error(
      `Неизвестный номер шара: ${number}`
    );
  }

  const striped =
    number >= 9 && number <= 15;

  const texture = createNumberedTexture(
    number,
    color,
    striped
  );

  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    roughness: 0.22,
    metalness: 0,
  });
}

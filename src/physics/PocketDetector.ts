
import {
  POCKETS,
  TABLE_LENGTH,
  TABLE_WIDTH,
  BALL_RADIUS,
  type Pocket,
} from '../game/TableConfig';

// Проверяет, находится ли шар в зоне захвата лузы
export function detectPocket(
  x: number,
  z: number
): Pocket | null {
  const halfL = TABLE_LENGTH / 2;
  const halfW = TABLE_WIDTH / 2;

  for (const pocket of POCKETS) {
    const dx = x - pocket.x;
    const dz = z - pocket.z;

    const distance = Math.hypot(dx, dz);

    // Радиус захвата немного меньше видимого отверстия.
    // Это снижает вероятность ложных попаданий.
    const captureRadius =
      pocket.radius - BALL_RADIUS * 0.25;

    if (distance > captureRadius) {
      continue;
    }

    // Угловые лузы имеют координату X на краю стола.
    const isCorner = Math.abs(pocket.x) > 0.001;

    let nearEdge: boolean;

    if (isCorner) {
      // Шар подошёл к одному из краёв угловой лузы
      nearEdge =
        Math.abs(x) >= halfL - pocket.radius * 0.75 ||
        Math.abs(z) >= halfW - pocket.radius * 0.75;
    } else {
      // Для средней лузы нужен подход к длинному борту
      nearEdge =
        Math.abs(z) >= halfW - pocket.radius * 0.65;
    }

    if (nearEdge) {
      return pocket;
    }
  }

  return null;
}

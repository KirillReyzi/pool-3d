
export const TABLE_LENGTH = 2.54;
export const TABLE_WIDTH = 1.27;

export const BALL_RADIUS = 0.028575;
export const FELT_HEIGHT = 0;

export const CORNER_POCKET_RADIUS = 0.09;
export const SIDE_POCKET_RADIUS = 0.095;

// Геометрия одного сегмента борта
export interface RailSegment {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  y: number;
}

// Описание одной лузы
export interface Pocket {
  id: number;
  x: number;
  z: number;
  radius: number;
}

const halfL = TABLE_LENGTH / 2;
const halfW = TABLE_WIDTH / 2;

// Общая конфигурация шести луз
export const POCKETS: Pocket[] = [
  {
    id: 0,
    x: -halfL,
    z: -halfW,
    radius: CORNER_POCKET_RADIUS,
  },
  {
    id: 1,
    x: 0,
    z: -halfW,
    radius: SIDE_POCKET_RADIUS,
  },
  {
    id: 2,
    x: halfL,
    z: -halfW,
    radius: CORNER_POCKET_RADIUS,
  },
  {
    id: 3,
    x: -halfL,
    z: halfW,
    radius: CORNER_POCKET_RADIUS,
  },
  {
    id: 4,
    x: 0,
    z: halfW,
    radius: SIDE_POCKET_RADIUS,
  },
  {
    id: 5,
    x: halfL,
    z: halfW,
    radius: CORNER_POCKET_RADIUS,
  },
];

// Размеры проходов у луз
const pocketGap = 0.03;

const longStart =
  halfL - CORNER_POCKET_RADIUS - pocketGap;

const middleEnd =
  SIDE_POCKET_RADIUS + pocketGap;

const longLength = longStart - middleEnd;
const longCenter = (longStart + middleEnd) / 2;

const shortLength =
  TABLE_WIDTH -
  2 * (CORNER_POCKET_RADIUS + pocketGap);

// Все шесть физических резиновых бортов
export const RAILS: RailSegment[] = [];

// Четыре длинных сегмента
for (const zSign of [-1, 1]) {
  for (const xSign of [-1, 1]) {
    RAILS.push({
      x: xSign * longCenter,
      z: zSign * (halfW + 0.012),
      width: longLength,
      depth: 0.025,
      height: 0.07,
      y: 0.035,
    });
  }
}

// Два коротких сегмента
for (const xSign of [-1, 1]) {
  RAILS.push({
    x: xSign * (halfL + 0.012),
    z: 0,
    width: 0.025,
    depth: shortLength,
    height: 0.07,
    y: 0.035,
  });
}

// Допуск за внешними границами игровой поверхности.
// Нужен, чтобы шар успел попасть в лузу, прежде
// чем будет признан вылетевшим со стола.
export const OUT_OF_BOUNDS_MARGIN = 0.16;

export function isOutOfBounds(
  x: number,
  z: number
): boolean {
  const halfL = TABLE_LENGTH / 2;
  const halfW = TABLE_WIDTH / 2;

  return (
    Math.abs(x) > halfL + OUT_OF_BOUNDS_MARGIN ||
    Math.abs(z) > halfW + OUT_OF_BOUNDS_MARGIN
  );
}
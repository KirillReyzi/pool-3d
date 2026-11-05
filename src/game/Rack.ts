
export type Rack = number[][];

/**
 * Формирует допустимую пирамиду пула-8.
 *
 * Верхушка: всегда №1.
 * Центр третьего ряда: №8.
 * Задние углы: разные группы.
 * Остальные позиции: случайные.
 */
export function createRack(
  random: () => number = Math.random
): Rack {
  const solids = [2, 3, 4, 5, 6, 7];
  const stripes = [9, 10, 11, 12, 13, 14, 15];

  // Выбираем по одному шару каждой группы
  // для двух задних углов.
  const solidCornerIndex = Math.floor(
    random() * solids.length
  );

  const stripeCornerIndex = Math.floor(
    random() * stripes.length
  );

  const solidCorner = solids.splice(
    solidCornerIndex,
    1
  )[0];

  const stripeCorner = stripes.splice(
    stripeCornerIndex,
    1
  )[0];

  // Случайно определяем, какая группа
  // будет в верхнем и нижнем углу.
  const corners = random() < 0.5
    ? [solidCorner, stripeCorner]
    : [stripeCorner, solidCorner];

  // Остальные 11 шаров.
  const remaining = [...solids, ...stripes];

  // Алгоритм перемешивания Фишера — Йетса.
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    [remaining[i], remaining[j]] = [
      remaining[j],
      remaining[i],
    ];
  }

  // Формируем пять рядов.
  return [
    [1],
    [remaining[0], remaining[1]],
    [remaining[2], 8, remaining[3]],
    [
      remaining[4],
      remaining[5],
      remaining[6],
      remaining[7],
    ],
    [
      corners[0],
      remaining[8],
      remaining[9],
      remaining[10],
      corners[1],
    ],
  ];
}

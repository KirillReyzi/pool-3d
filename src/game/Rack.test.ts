
import { describe, expect, it } from 'vitest';
import { createRack } from './Rack';

describe('Rack — расстановка пула-8', () => {
  it('Каждый шар встречается ровно один раз', () => {
    for (let i = 0; i < 100; i++) {
      const rack = createRack();
      const numbers = rack.flat();

      expect(numbers).toHaveLength(15);

      expect([...numbers].sort((a, b) => a - b))
        .toEqual(
          Array.from({ length: 15 }, (_, j) => j + 1)
        );
    }
  });

  it('Верхушка и восьмёрка всегда на своих местах', () => {
    for (let i = 0; i < 100; i++) {
      const rack = createRack();

      expect(rack.map(row => row.length))
        .toEqual([1, 2, 3, 4, 5]);

      expect(rack[0][0]).toBe(1);
      expect(rack[2][1]).toBe(8);
    }
  });

  it('Задние углы занимают разные группы', () => {
    for (let i = 0; i < 100; i++) {
      const rack = createRack();

      const first = rack[4][0];
      const last = rack[4][4];

      const firstSolid = first >= 1 && first <= 7;
      const lastSolid = last >= 1 && last <= 7;

      expect(firstSolid).not.toBe(lastSolid);
    }
  });

  it('Расстановка допускает разные комбинации', () => {
    let seed = 123456789;

    const random = (): number => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const variants = new Set<string>();

    for (let i = 0; i < 30; i++) {
      variants.add(JSON.stringify(createRack(random)));
    }

    expect(variants.size).toBeGreaterThan(1);
  });
});

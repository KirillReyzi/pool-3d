
import { describe, expect, it } from 'vitest';

import {
  ShotPlanner,
  type BotShotInput,
} from './ShotPlanner';

// Фиксируем случайность для воспроизводимости.
const planner = new ShotPlanner(() => 0.5);

describe('ShotPlanner — простой бот', () => {
  it('На разбое направляет биток к пирамиде', () => {
    const input: BotShotInput = {
      phase: 'break',
      group: null,
      balls: [
        { number: 0, x: -0.65, z: 0 },
        { number: 1, x: 0.57, z: 0 },
      ],
    };

    const shot = planner.plan(input);

    expect(shot).not.toBeNull();
    expect(shot?.kind).toBe('break');
    expect(shot?.directionX).toBeCloseTo(1);
    expect(shot?.directionZ).toBeCloseTo(0);
    expect(shot?.power).toBe(6);
  });

  it('Игрок со сплошными не выбирает полосатый', () => {
    const input: BotShotInput = {
      phase: 'assigned',
      group: 'solids',
      balls: [
        { number: 0, x: -0.7, z: 0 },
        { number: 2, x: 0, z: 0 },
        { number: 10, x: 0.3, z: 0.2 },
        { number: 8, x: 0.5, z: -0.2 },
      ],
    };

    const shot = planner.plan(input);

    expect(shot).not.toBeNull();
    expect(shot?.targetBall).toBe(2);
  });

  it('После очистки группы разрешает восьмёрку', () => {
    const input: BotShotInput = {
      phase: 'assigned',
      group: 'solids',
      balls: [
        { number: 0, x: -0.7, z: 0 },
        { number: 8, x: 0, z: 0 },
        { number: 10, x: 0.5, z: 0.3 },
      ],
    };

    const shot = planner.plan(input);

    expect(shot).not.toBeNull();
    expect(shot?.targetBall).toBe(8);
  });

  it('Не планирует удар без битка', () => {
    const input: BotShotInput = {
      phase: 'open',
      group: null,
      balls: [
        { number: 2, x: 0, z: 0 },
      ],
    };

    expect(planner.plan(input)).toBeNull();
  });

  it('Не планирует удар после завершения партии', () => {
    const input: BotShotInput = {
      phase: 'finished',
      group: null,
      balls: [
        { number: 0, x: -0.65, z: 0 },
        { number: 2, x: 0, z: 0 },
      ],
    };

    expect(planner.plan(input)).toBeNull();
  });
});


import { describe, expect, it } from 'vitest';

import { BotController } from './BotController';
import { ShotPlanner } from './ShotPlanner';

import type { BotWorldView } from './BotController';
import { MatchController } from '../game/MatchController';

describe('BotController', () => {
  const bot = new BotController(
    new ShotPlanner(() => 0.5)
  );

  it('Выбирает допустимую позицию перед разбоем', () => {
    const world: BotWorldView = {
      getBallPosition: () => null,

      canPlaceCueBall: (x, z, openingBreak) =>
        openingBreak === true &&
        x <= -0.65 &&
        Math.abs(z) <= 0.4,
    };

    const position = bot.chooseCueBallPosition(
      world,
      true
    );

    expect(position).not.toBeNull();
    expect(position!.x).toBeLessThanOrEqual(-0.65);

    expect(
      world.canPlaceCueBall(
        position!.x,
        position!.z,
        true
      )
    ).toBe(true);
  });

  it('Не выбирает запрещённые позиции', () => {
    const world: BotWorldView = {
      getBallPosition: () => null,
      canPlaceCueBall: () => false,
    };

    expect(
      bot.chooseCueBallPosition(world, false)
    ).toBeNull();
  });

  it('Не управляет ходом человека', () => {
    const match = new MatchController();

    const world: BotWorldView = {
      getBallPosition: number => {
        if (number === 0) {
          return { x: -0.65, z: 0 };
        }

        if (number === 1) {
          return { x: 0.57, z: 0 };
        }

        return null;
      },

      canPlaceCueBall: () => true,
    };

    const plannedShot = bot.planShot(
      match.getSnapshot(),
      world
    );

    expect(plannedShot).toBeNull();
  });

  it('Планирует разбой, когда ходит бот', () => {
    const match = new MatchController();

    // Первый игрок выполняет слабый разбой.
    match.startShot();

    match.rules.handlePhysicsEvent({
      type: 'ball-collision',
      ballA: 0,
      ballB: 1,
    });

    const outcome = match.completeShot();

    expect(outcome?.resetRack).toBe(true);

    const world: BotWorldView = {
      getBallPosition: number => {
        if (number === 0) {
          return { x: -0.65, z: 0 };
        }

        if (number === 1) {
          return { x: 0.57, z: 0 };
        }

        return null;
      },

      canPlaceCueBall: () => true,
    };

    const plannedShot = bot.planShot(
      match.getSnapshot(),
      world
    );

    expect(plannedShot).not.toBeNull();
    expect(plannedShot?.kind).toBe('break');
    expect(plannedShot?.power).toBe(6);
  });
});

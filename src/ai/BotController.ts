
import { ShotPlanner } from './ShotPlanner';
import type { PlannedShot, BotBall } from './ShotPlanner';
import type { MatchSnapshot } from '../game/MatchController';

/**
 * Минимальный интерфейс физического мира,
 * который необходим боту.
 *
 * Не зависит напрямую от Rapier или Three.js.
 */
export interface BotWorldView {
  getBallPosition(
    number: number
  ): { x: number; z: number } | null | undefined;

  canPlaceCueBall(
    x: number,
    z: number,
    openingBreak?: boolean
  ): boolean;
}

export interface BotPlacement {
  x: number;
  z: number;
}

export class BotController {
  private readonly planner: ShotPlanner;

  constructor(planner: ShotPlanner = new ShotPlanner()) {
    this.planner = planner;
  }

  /**
   * Собирает координаты шаров и запрашивает
   * у ShotPlanner направление и силу удара.
   */
  public planShot(
    snapshot: MatchSnapshot,
    world: BotWorldView
  ): PlannedShot | null {
    if (
      snapshot.currentPlayerKind !== 'bot' ||
      snapshot.shotActive ||
      snapshot.ballInHand ||
      snapshot.phase === 'finished' ||
      snapshot.phase === 'break-decision'
    ) {
      return null;
    }

    const balls: BotBall[] = [];

    for (let number = 0; number <= 15; number++) {
      const position = world.getBallPosition(number);

      if (!position) continue;

      balls.push({
        number,
        x: position.x,
        z: position.z,
      });
    }

    const player = snapshot.players.find(
      item => item.id === snapshot.currentPlayerId
    );

    if (!player) return null;

    return this.planner.plan({
      phase: snapshot.phase,
      group: player.group,
      balls,
    });
  }

  /**
   * Выбирает допустимое положение битка.
   *
   * MVP: перебираем заранее заданные точки.
   * Позднее бот будет оценивать позицию
   * с точки зрения удобства следующего удара.
   */
  public chooseCueBallPosition(
    world: BotWorldView,
    openingBreak: boolean
  ): BotPlacement | null {
    const xPositions = openingBreak
      ? [-0.85, -0.75, -0.65]
      : [-0.65, -0.3, 0, 0.3, 0.65, 0.9];

    const zPositions = [
      0,
      0.18,
      -0.18,
      0.35,
      -0.35,
      0.48,
      -0.48,
    ];

    for (const x of xPositions) {
      for (const z of zPositions) {
        if (
          world.canPlaceCueBall(x, z, openingBreak)
        ) {
          return { x, z };
        }
      }
    }

    return null;
  }
}

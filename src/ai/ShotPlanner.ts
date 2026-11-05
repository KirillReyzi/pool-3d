
import {
  BALL_RADIUS,
  TABLE_LENGTH,
  TABLE_WIDTH,
  POCKETS,
} from '../game/TableConfig';

import type {
  BallGroup,
  MatchPhase,
} from '../game/GameRules';

// Положение шара на столе.
export interface BotBall {
  number: number;
  x: number;
  z: number;
}

// Информация, необходимая боту.
export interface BotShotInput {
  phase: MatchPhase;
  group: BallGroup;
  balls: BotBall[];
}

// Результат планирования удара.
export interface PlannedShot {
  directionX: number;
  directionZ: number;
  power: number;

  targetBall: number;
  targetPocket: number | null;

  kind: 'break' | 'pot' | 'fallback';
}

interface Point {
  x: number;
  z: number;
}

interface Candidate {
  ball: BotBall;
  pocketId: number;
  directionX: number;
  directionZ: number;
  power: number;
  score: number;
}

export class ShotPlanner {
    private readonly random: () => number;
  // Источник случайных чисел можно заменить
  // при тестировании для повторяемости.
  constructor(random: () => number = Math.random) {
  this.random = random;
}

  // Нормализация двумерного вектора.
  private normalize(x: number, z: number): Point {
    const length = Math.hypot(x, z);

    if (length < 0.000001) {
      return { x: 1, z: 0 };
    }

    return {
      x: x / length,
      z: z / length,
    };
  }

  private distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  // Проверка свободного отрезка.
  // exclude содержит номера шаров, которые
  // не должны считаться препятствиями.
  private isPathClear(
    from: Point,
    to: Point,
    balls: readonly BotBall[],
    exclude: readonly number[]
  ): boolean {
    const vx = to.x - from.x;
    const vz = to.z - from.z;

    const lengthSq = vx * vx + vz * vz;

    if (lengthSq < 0.000001) {
      return false;
    }

    const clearance = BALL_RADIUS * 2 + 0.002;

    for (const ball of balls) {
      if (exclude.includes(ball.number)) continue;

      // Проекция центра шара на отрезок.
      const projection =
        ((ball.x - from.x) * vx +
          (ball.z - from.z) * vz) / lengthSq;

      const t = Math.max(
        0,
        Math.min(1, projection)
      );

      const closestX = from.x + vx * t;
      const closestZ = from.z + vz * t;

      const distance = Math.hypot(
        ball.x - closestX,
        ball.z - closestZ
      );

      if (distance < clearance) {
        return false;
      }
    }

    return true;
  }

  // Допустимые прицельные шары.
  private getLegalTargets(
    input: BotShotInput
  ): BotBall[] {
    const objects = input.balls.filter(
      ball => ball.number !== 0
    );

    const solids = objects.filter(
      ball => ball.number >= 1 &&
              ball.number <= 7
    );

    const stripes = objects.filter(
      ball => ball.number >= 9 &&
              ball.number <= 15
    );

    if (input.group === 'solids') {
      return solids.length > 0
        ? solids
        : objects.filter(ball => ball.number === 8);
    }

    if (input.group === 'stripes') {
      return stripes.length > 0
        ? stripes
        : objects.filter(ball => ball.number === 8);
    }

    // На открытом столе восьмёрка
    // не может быть первым объектом удара.
    return [...solids, ...stripes];
  }

  // Определяем силу удара приблизительно
  // по общей длине траектории.
  private estimatePower(distance: number): number {
    return Math.max(
      2,
      Math.min(6, 2.2 + distance * 1.25)
    );
  }

  private addError(
    directionX: number,
    directionZ: number,
    kind: PlannedShot['kind']
  ): Point {
    // Для разбоя намеренно не добавляем
    // существенную ошибку направления.
    const maxError =
      kind === 'break' ? 0.005 : 0.025;

    const error =
      (this.random() * 2 - 1) * maxError;

    const angle =
      Math.atan2(directionZ, directionX) + error;

    return {
      x: Math.cos(angle),
      z: Math.sin(angle),
    };
  }

  private findCandidates(
    cue: BotBall,
    targets: readonly BotBall[],
    allBalls: readonly BotBall[]
  ): Candidate[] {
    const candidates: Candidate[] = [];

    const halfLength = TABLE_LENGTH / 2;
    const halfWidth = TABLE_WIDTH / 2;

    for (const ball of targets) {
      for (const pocket of POCKETS) {
        // Направление прицельного шара в лузу.
        const ballToPocket = this.normalize(
          pocket.x - ball.x,
          pocket.z - ball.z
        );

        // Ghost ball — точка, в которой должен
        // находиться центр битка при столкновении.
        const ghost: Point = {
          x: ball.x - ballToPocket.x * BALL_RADIUS * 2,
          z: ball.z - ballToPocket.z * BALL_RADIUS * 2,
        };

        // Не планируем контакт за пределами стола.
        if (
          Math.abs(ghost.x) >
            halfLength - BALL_RADIUS ||
          Math.abs(ghost.z) >
            halfWidth - BALL_RADIUS
        ) {
          continue;
        }

        const cueToGhost = this.normalize(
          ghost.x - cue.x,
          ghost.z - cue.z
        );

        const cueDistance = this.distance(cue, ghost);
        const pocketDistance = this.distance(ball, pocket);

        // Нельзя ударить, если расстояние до
        // расчётной точки практически нулевое.
        if (cueDistance < 0.005) continue;

        // Проверяем путь битка до точки контакта.
        if (!this.isPathClear(
          cue,
          ghost,
          allBalls,
          [0, ball.number]
        )) {
          continue;
        }

        // Проверяем путь прицельного шара в лузу.
        if (!this.isPathClear(
          ball,
          pocket,
          allBalls,
          [0, ball.number]
        )) {
          continue;
        }

        // Чем ближе угол удара к прямому,
        // тем проще геометрически забить шар.
        const alignment =
          cueToGhost.x * ballToPocket.x +
          cueToGhost.z * ballToPocket.z;

        // Сильно обратные углы исключаем.
        if (alignment < 0.1) continue;

        // Чем меньше score, тем перспективнее удар.
        const score =
          cueDistance +
          pocketDistance * 0.7 +
          (1 - alignment) * 2.5;

        candidates.push({
          ball,
          pocketId: pocket.id,
          directionX: cueToGhost.x,
          directionZ: cueToGhost.z,
          power: this.estimatePower(
            cueDistance + pocketDistance
          ),
          score,
        });
      }
    }

    return candidates;
  }

  // Основная функция планирования.
  public plan(input: BotShotInput): PlannedShot | null {
    const cue = input.balls.find(
      ball => ball.number === 0
    );

    if (!cue) return null;

    // Разбой: направляем биток к пирамиде.
    if (input.phase === 'break') {
      const direction = this.addError(
        1, 0, 'break'
      );

      return {
        directionX: direction.x,
        directionZ: direction.z,
        power: 6,
        targetBall: 1,
        targetPocket: null,
        kind: 'break',
      };
    }

    if (
      input.phase === 'finished' ||
      input.phase === 'break-decision'
    ) {
      return null;
    }

    const targets = this.getLegalTargets(input);

    if (targets.length === 0) return null;

    const candidates = this.findCandidates(
      cue,
      targets,
      input.balls
    );

    // Выбираем наиболее простой прямой удар.
    candidates.sort((a, b) => a.score - b.score);

    const best = candidates[0];

    if (best) {
      const direction = this.addError(
        best.directionX,
        best.directionZ,
        'pot'
      );

      return {
        directionX: direction.x,
        directionZ: direction.z,
        power: best.power,
        targetBall: best.ball.number,
        targetPocket: best.pocketId,
        kind: 'pot',
      };
    }

    // Запасной вариант:
    // пытаемся попасть в ближайший разрешённый шар.
    const ordered = [...targets].sort(
      (a, b) =>
        this.distance(cue, a) -
        this.distance(cue, b)
    );

    const visibleTarget = ordered.find(ball =>
      this.isPathClear(
        cue,
        ball,
        input.balls,
        [0, ball.number]
      )
    );

    const target = visibleTarget ?? ordered[0];

    const direction = this.normalize(
      target.x - cue.x,
      target.z - cue.z
    );

    const noisy = this.addError(
      direction.x,
      direction.z,
      'fallback'
    );

    return {
      directionX: noisy.x,
      directionZ: noisy.z,
      power: this.estimatePower(
        this.distance(cue, target)
      ),
      targetBall: target.number,
      targetPocket: null,
      kind: 'fallback',
    };
  }
}


import RAPIER from '@dimforge/rapier3d-compat';

import {
  BALL_RADIUS,
  RAILS,
  TABLE_LENGTH,
  TABLE_WIDTH,
  isOutOfBounds,
} from '../game/TableConfig';

import { detectPocket } from './PocketDetector';

// Данные, которые физика получает от графического модуля
export interface BallStartPosition {
  number: number;
  x: number;
  z: number;
}



export interface BallPocketedEvent {
  type: 'ball-pocketed';
  ballNumber: number;
  pocketId: number;
}

export interface BallOutOfBoundsEvent {
  type: 'ball-out-of-bounds';
  ballNumber: number;
}


export interface BallCollisionEvent {
  type: 'ball-collision';
  ballA: number;
  ballB: number;
}

export interface RailCollisionEvent {
  type: 'rail-collision';
  ballNumber: number;
  railId: number;
}

export type PhysicsEvent =
  | BallPocketedEvent
  | BallOutOfBoundsEvent
  | BallCollisionEvent
  | RailCollisionEvent;



export class PhysicsWorld {
  private world: RAPIER.World;

    private eventQueue = new RAPIER.EventQueue(true);

    // Связываем идентификатор коллайдера с номером шара
    private colliderToBall = new Map<number, number>();

    // Связываем идентификатор коллайдера с номером борта
    private colliderToRail = new Map<number, number>();


  // Каждому номеру шара соответствует физическое тело
  private balls = new Map<number, RAPIER.RigidBody>();
  private events: PhysicsEvent[] = [];
  public readonly fixedTimeStep = 1 / 120;

  private readonly rollingDeceleration = 0.35;
  private readonly stopSpeed = 0.015;

  constructor(initialBalls: BallStartPosition[]) {
    this.world = new RAPIER.World({
      x: 0,
      y: 0,
      z: 0,
    });

    this.world.timestep = this.fixedTimeStep;

    // Создаём физические тела для всех 16 шаров
    for (const ball of initialBalls) {
      this.createBall(ball);
    }

    this.createRails();
  }



private processCollisions(): void {
  this.eventQueue.drainCollisionEvents(
    (handle1, handle2, started) => {
      // Нас интересует только начало контакта
      if (!started) return;

      const ball1 = this.colliderToBall.get(handle1);
      const ball2 = this.colliderToBall.get(handle2);

      const rail1 = this.colliderToRail.get(handle1);
      const rail2 = this.colliderToRail.get(handle2);

      // Столкновение двух шаров
      if (ball1 !== undefined && ball2 !== undefined) {
        this.events.push({
          type: 'ball-collision',
          ballA: ball1,
          ballB: ball2,
        });

        return;
      }

      // Первый коллайдер — шар, второй — борт
      if (ball1 !== undefined && rail2 !== undefined) {
        this.events.push({
          type: 'rail-collision',
          ballNumber: ball1,
          railId: rail2,
        });

        return;
      }

      // Первый коллайдер — борт, второй — шар
      if (rail1 !== undefined && ball2 !== undefined) {
        this.events.push({
          type: 'rail-collision',
          ballNumber: ball2,
          railId: rail1,
        });
      }
    }
  );
}


// Проверяем, свободна ли позиция от других шаров
public isPositionFree(x: number, z: number): boolean {
  const minDistance = BALL_RADIUS * 2 + 0.003;

  for (const [number, body] of this.balls) {
    if (number === 0) continue;

    const position = body.translation();

    const distance = Math.hypot(
      position.x - x,
      position.z - z
    );

    if (distance < minDistance) {
      return false;
    }
  }

  return true;
}

// Находим свободную позицию для битка
private findCueBallSpawn(): { x: number; z: number } | null {
  const halfL = TABLE_LENGTH / 2;
  const halfW = TABLE_WIDTH / 2;

  // Сначала пробуем исходную позицию
  const candidates: { x: number; z: number }[] = [
    { x: -0.65, z: 0 },
  ];

  // Затем перебираем запасные позиции
  for (let x = -0.9; x <= -0.3; x += 0.1) {
    for (let z = -0.35; z <= 0.35; z += 0.1) {
      candidates.push({ x, z });
    }
  }

  for (const point of candidates) {
    // Проверяем, что шар находится на столе
    if (
      Math.abs(point.x) >= halfL - BALL_RADIUS ||
      Math.abs(point.z) >= halfW - BALL_RADIUS
    ) {
      continue;
    }

    if (
      detectPocket(point.x, point.z) === null &&
      this.isPositionFree(point.x, point.z)
    ) {
      return point;
    }
  }

  return null;
}

// Создаём физическое тело битка после фола
public respawnCueBall(): { x: number; z: number } | null {
  // Если биток уже на столе, не создаём дубликат
  if (this.balls.has(0)) {
    return null;
  }

  // Возвращаем биток только после остановки шаров
  if (!this.allBallsStopped()) {
    return null;
  }

  const spawn = this.findCueBallSpawn();

  if (!spawn) {
    return null;
  }

  this.createBall({
    number: 0,
    x: spawn.x,
    z: spawn.z,
  });

  return spawn;
}


public placeCueBall(
  x: number,
  z: number,
  openingBreak = false
): boolean {
  if (!this.allBallsStopped()) return false;

  if (!this.canPlaceCueBall(x, z, openingBreak)) {
    return false;
  }

  const existingCueBall = this.balls.get(0);

  if (existingCueBall) {
    // Биток уже существует: перемещаем тело.
    existingCueBall.setTranslation(
      { x, y: BALL_RADIUS, z },
      true
    );

    existingCueBall.setLinvel(
      { x: 0, y: 0, z: 0 },
      true
    );

    existingCueBall.setAngvel(
      { x: 0, y: 0, z: 0 },
      true
    );
  } else {
    // Биток был забит: создаём физическое тело.
    this.createBall({
      number: 0,
      x,
      z,
    });
  }

  return true;
}


public canPlaceCueBall(
  x: number,
  z: number,
  openingBreak = false
): boolean {
  const halfLength = TABLE_LENGTH / 2;
  const halfWidth = TABLE_WIDTH / 2;

  // Координаты должны быть конечными числами.
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return false;
  }

  // Центр шара не должен выходить за края сукна.
  if (
    Math.abs(x) > halfLength - BALL_RADIUS ||
    Math.abs(z) > halfWidth - BALL_RADIUS
  ) {
    return false;
  }

  // При разбое ставим биток в начальной четверти.
  if (openingBreak && x > -TABLE_LENGTH / 4) {
    return false;
  }

  // Не допускаем размещение в отверстии лузы.
  if (detectPocket(x, z) !== null) {
    return false;
  }

  // Проверяем пересечения со всеми прицельными
  // шарами, кроме самого битка (номер 0).
  const minDistance = BALL_RADIUS * 2 + 0.001;

  for (let number = 1; number <= 15; number++) {
    const position = this.getBallPosition(number);
    if (!position) continue;

    const distance = Math.hypot(
      x - position.x,
      z - position.z
    );

    if (distance < minDistance) {
      return false;
    }
  }

  return true;
}


private processBallExits(): void {
  const removed: {
    number: number;
    body: RAPIER.RigidBody;
    event: PhysicsEvent;
  }[] = [];

  for (const [number, body] of this.balls) {
    const position = body.translation();

    // Приоритет №1 — попадание в лузу
    const pocket = detectPocket(
      position.x,
      position.z
    );

    if (pocket) {
      removed.push({
        number,
        body,
        event: {
          type: 'ball-pocketed',
          ballNumber: number,
          pocketId: pocket.id,
        },
      });

      continue;
    }

    // Приоритет №2 — вылет за границы стола
    if (isOutOfBounds(position.x, position.z)) {
      removed.push({
        number,
        body,
        event: {
          type: 'ball-out-of-bounds',
          ballNumber: number,
        },
      });
    }
  }

  // Удаляем физические тела после всех проверок
  for (const item of removed) {
    for (let i = 0; i < item.body.numColliders(); i++) {
  const collider = item.body.collider(i);

  this.colliderToBall.delete(collider.handle);
}
    this.world.removeRigidBody(item.body);
    this.balls.delete(item.number);

    this.events.push(item.event);
  }
}



  private createBall(data: BallStartPosition): void {
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(data.x, BALL_RADIUS, data.z)
      .setCanSleep(false)
      .setCcdEnabled(true)
      .enabledTranslations(true, false, true)
      .enabledRotations(false, false, false);

    const body = this.world.createRigidBody(bodyDesc);

    // Плотность для массы 170 г
    const volume =
      (4 / 3) * Math.PI * BALL_RADIUS ** 3;

    const density = 0.17 / volume;

    
const colliderDesc = RAPIER.ColliderDesc
  .ball(BALL_RADIUS)
  .setDensity(density)
  .setRestitution(0.93)
  .setFriction(0)
  .setActiveEvents(
    RAPIER.ActiveEvents.COLLISION_EVENTS
  );

const collider = this.world.createCollider(
  colliderDesc,
  body
);

this.colliderToBall.set(
  collider.handle,
  data.number
);

this.balls.set(data.number, body);

  }

  
private createRails(): void {
  RAILS.forEach((rail, index) => {
    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      rail.width / 2,
      rail.height / 2,
      rail.depth / 2
    )
      .setTranslation(rail.x, rail.y, rail.z)
      .setRestitution(0.85)
      .setFriction(0)
      .setActiveEvents(
        RAPIER.ActiveEvents.COLLISION_EVENTS
      );

    const collider = this.world.createCollider(
      colliderDesc
    );

    this.colliderToRail.set(
      collider.handle,
      index
    );
  });
}


  // Проверяем, остановились ли все шары
  public allBallsStopped(): boolean {
    for (const body of this.balls.values()) {
      const velocity = body.linvel();

      if (Math.hypot(velocity.x, velocity.z) > 0.02) {
        return false;
      }
    }

    return true;
  }

  // Наносим удар битком в направлении пирамиды
 
public hitCueBall(
  directionX: number,
  directionZ: number,
  power: number
): void {
  if (!this.allBallsStopped()) return;

  const cueBall = this.balls.get(0);
  if (!cueBall) return;

  // Нормализуем направление
  const length = Math.hypot(
    directionX,
    directionZ
  );

  if (length < 0.0001) return;

  const x = directionX / length;
  const z = directionZ / length;

  // Ограничиваем скорость удара
  const speed = Math.max(
    0.5,
    Math.min(power, 6)
  );

  cueBall.setLinvel(
    {
      x: x * speed,
      y: 0,
      z: z * speed,
    },
    true
  );
}


  // Рассчитываем один физический шаг
  public step(): void {
  this.applyRollingResistance();

  this.world.step(this.eventQueue);

  // Сначала обрабатываем столкновения
  this.processCollisions();

  // Затем лузы и выход за границы
  this.processBallExits();
}

  private applyRollingResistance(): void {
    for (const body of this.balls.values()) {
      const velocity = body.linvel();

      const speed = Math.hypot(
        velocity.x,
        velocity.z
      );

      if (speed === 0) continue;

      const newSpeed = Math.max(
        0,
        speed -
          this.rollingDeceleration * this.fixedTimeStep
      );

      if (newSpeed < this.stopSpeed) {
        body.setLinvel(
          { x: 0, y: 0, z: 0 },
          true
        );
        continue;
      }

      const factor = newSpeed / speed;

      body.setLinvel(
        {
          x: velocity.x * factor,
          y: 0,
          z: velocity.z * factor,
        },
        true
      );
    }
  }

  // Возвращаем координаты конкретного шара
  public getBallPosition(number: number) {
    return this.balls.get(number)?.translation();
  }


public consumeEvents(): PhysicsEvent[] {
  const result = this.events;

  // Сбрасываем очередь после чтения
  this.events = [];

  return result;
}


public dispose(): void {
  // Очищаем игровые коллекции.
  this.balls.clear();
  this.colliderToBall.clear();
  this.colliderToRail.clear();
  this.events = [];

  // Освобождаем память WebAssembly.
  this.eventQueue.free();
  this.world.free();
}


}

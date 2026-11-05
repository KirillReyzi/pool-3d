
import * as THREE from 'three';

import {
  BALL_RADIUS,
  TABLE_LENGTH,
  TABLE_WIDTH,
} from './TableConfig';

export interface AimBallPosition {
  x: number;
  z: number;
}

export class CueController {
  private group = new THREE.Group();

  private cue: THREE.Mesh;
  private aimLine: THREE.Line;

  // Элементы интерфейса силы удара.
  private powerPanel: HTMLDivElement;
  private powerFill: HTMLDivElement;
  private powerText: HTMLSpanElement;

  private readonly minPower = 0.5;
  private readonly maxPower = 6;


// =====================================
// Анимация удара
// =====================================

// Длина кия совпадает с длиной,
// использованной в конструкторе.
private readonly cueLength = 0.65;

// Начальный зазор между наконечником и битком.
private readonly cueGap = BALL_RADIUS + 0.035;

// Насколько кий отводится назад при замахе.
private readonly backswingDistance = 0.11;

// Продолжительность замаха и удара.
private readonly backswingDuration = 0.24;
private readonly forwardDuration = 0.13;

private strokeElapsed = 0;
private strokeActive = false;

// Защита от повторного применения удара.
private strokeImpactEmitted = false;


private getCueRestX(): number {
  return -this.cueGap - this.cueLength / 2;
}

  constructor(scene: THREE.Scene) {
    // =====================================
    // 1. ВИЗУАЛЬНЫЙ КИЙ
    // =====================================

    const cueLength = 0.65;

    const cueGeometry = new THREE.CylinderGeometry(
      0.004,
      0.012,
      cueLength,
      12
    );

    const cueMaterial = new THREE.MeshStandardMaterial({
      color: 0xb88452,
      roughness: 0.55,
      metalness: 0,
    });

    this.cue = new THREE.Mesh(
      cueGeometry,
      cueMaterial
    );

    this.cue.rotation.z = -Math.PI / 2;

    
    this.cue.position.x = this.getCueRestX();

    this.cue.castShadow = true;
    this.group.add(this.cue);

    // =====================================
    // 2. ПРИЦЕЛЬНАЯ ЛИНИЯ
    // =====================================

    const lineGeometry = new THREE.BufferGeometry();

    lineGeometry.setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });

    this.aimLine = new THREE.Line(
      lineGeometry,
      lineMaterial
    );

    this.aimLine.renderOrder = 20;

    this.group.add(this.aimLine);

    this.group.visible = false;

    scene.add(this.group);

    // =====================================
    // 3. ИНДИКАТОР СИЛЫ УДАРА
    // =====================================

    this.powerPanel = document.createElement('div');

    Object.assign(this.powerPanel.style, {
      position: 'fixed',
      left: '50%',
      bottom: '35px',
      transform: 'translateX(-50%)',
      width: '240px',
      padding: '12px 16px',
      background: 'rgba(10, 20, 17, 0.85)',
      borderRadius: '10px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      zIndex: '100',
      pointerEvents: 'none',
      display: 'none',
    });

    const header = document.createElement('div');

    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '10px',
    });

    const label = document.createElement('span');
    label.textContent = 'Сила удара';

    this.powerText = document.createElement('span');
    this.powerText.textContent = '2.50';

    header.append(label, this.powerText);

    const track = document.createElement('div');

    Object.assign(track.style, {
      width: '100%',
      height: '9px',
      background: '#45534d',
      borderRadius: '5px',
      overflow: 'hidden',
    });

    this.powerFill = document.createElement('div');

    Object.assign(this.powerFill.style, {
      height: '100%',
      width: '0%',
      background: '#e8c36a',
      borderRadius: '5px',
    });

    track.appendChild(this.powerFill);

    this.powerPanel.append(header, track);
    document.body.appendChild(this.powerPanel);
  }

  // =====================================
  // 4. РАСЧЁТ ПЕРВОГО ПРЕПЯТСТВИЯ
  // =====================================

  private getAimDistance(
    cueX: number,
    cueZ: number,
    dx: number,
    dz: number,
    balls: readonly AimBallPosition[]
  ): number {
    // Ограничение центром битка внутри стола.
    const halfL = TABLE_LENGTH / 2 - BALL_RADIUS;
    const halfW = TABLE_WIDTH / 2 - BALL_RADIUS;

    let distance = Infinity;

    // Расстояние до границ прямоугольного поля.
    if (dx > 0.000001) {
      distance = Math.min(
        distance,
        (halfL - cueX) / dx
      );
    } else if (dx < -0.000001) {
      distance = Math.min(
        distance,
        (-halfL - cueX) / dx
      );
    }

    if (dz > 0.000001) {
      distance = Math.min(
        distance,
        (halfW - cueZ) / dz
      );
    } else if (dz < -0.000001) {
      distance = Math.min(
        distance,
        (-halfW - cueZ) / dz
      );
    }

    // Сумма радиусов битка и прицельного шара.
    const collisionRadius = BALL_RADIUS * 2;

    for (const ball of balls) {
      const offsetX = cueX - ball.x;
      const offsetZ = cueZ - ball.z;

      // Решаем уравнение пересечения луча
      // с окружностью радиуса collisionRadius.
      const b = offsetX * dx + offsetZ * dz;

      const c =
        offsetX * offsetX +
        offsetZ * offsetZ -
        collisionRadius * collisionRadius;

      // Если шары уже пересекаются, не пытаемся
      // вычислять новую траекторию.
      if (c <= 0) {
        distance = Math.min(distance, 0);
        continue;
      }

      // Окружность позади направления удара.
      if (b >= 0) continue;

      const discriminant = b * b - c;

      if (discriminant < 0) continue;

      // Первая точка пересечения.
      const hitDistance =
        -b - Math.sqrt(discriminant);

      if (hitDistance >= 0) {
        distance = Math.min(
          distance,
          hitDistance
        );
      }
    }

    if (!Number.isFinite(distance)) {
      return 0;
    }

    return Math.max(0, distance);
  }

  // =====================================
  // 5. ОБНОВЛЕНИЕ КИЯ И ЛИНИИ
  // =====================================


public beginStroke(): void {
  // Анимация может начинаться только один раз.
  if (this.strokeActive) return;

  this.strokeActive = true;
  this.strokeElapsed = 0;
  this.strokeImpactEmitted = false;

  // Начальное положение кия.
  this.cue.position.x = this.getCueRestX();

  // Кий остаётся видимым до удара.
  this.group.visible = true;
}


public updateStroke(delta: number): boolean {
  if (!this.strokeActive) return false;

  this.strokeElapsed += delta;

  const restX = this.getCueRestX();

  // -----------------------------
  // Фаза 1: замах назад
  // -----------------------------

  if (this.strokeElapsed < this.backswingDuration) {
    const t =
      this.strokeElapsed / this.backswingDuration;

    // Плавное ускорение и замедление.
    const eased =
      t * t * (3 - 2 * t);

    this.cue.position.x =
      restX - this.backswingDistance * eased;

    return false;
  }

  // -----------------------------
  // Фаза 2: движение вперёд
  // -----------------------------

  const forwardElapsed =
    this.strokeElapsed - this.backswingDuration;

  const t = THREE.MathUtils.clamp(
    forwardElapsed / this.forwardDuration,
    0,
    1
  );

  // Ускоренное движение к битку.
  const eased = t * t;

  // Из крайней задней позиции кий движется
  // к точке визуального контакта.
  this.cue.position.x =
    restX -
    this.backswingDistance +
    (this.backswingDistance + 0.035) * eased;

  // Когда наконечник достиг битка,
  // возвращаем true ровно один раз.
  if (t >= 1 && !this.strokeImpactEmitted) {
    this.strokeImpactEmitted = true;
    this.strokeActive = false;

    return true;
  }

  return false;
}


public resetStroke(): void {
  this.strokeActive = false;
  this.strokeElapsed = 0;
  this.strokeImpactEmitted = false;

  this.cue.position.x = this.getCueRestX();
}


  public update(
    x: number,
    z: number,
    angle: number,
    balls: readonly AimBallPosition[] = []
  ): void {
    this.group.position.set(
      x,
      BALL_RADIUS,
      z
    );

    this.group.rotation.y = -angle;

    const dx = Math.cos(angle);
    const dz = Math.sin(angle);

    const distance = this.getAimDistance(
      x,
      z,
      dx,
      dz,
      balls
    );

    const start = BALL_RADIUS + 0.01;

    // Линия заканчивается в точке столкновения.
    const end = Math.max(
      start,
      distance
    );

    // Группа расположена на высоте центра битка,
    // поэтому линию опускаем к поверхности сукна.
    const lineY = -BALL_RADIUS + 0.008;

    const positions =
      this.aimLine.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;

    positions.setXYZ(0, start, lineY, 0);
    positions.setXYZ(1, end, lineY, 0);

    positions.needsUpdate = true;

    this.aimLine.geometry.computeBoundingSphere();

    this.aimLine.visible = distance > start;
  }

  // =====================================
  // 6. СИЛА УДАРА
  // =====================================

  public setPower(power: number): void {
    const clamped = THREE.MathUtils.clamp(
      power,
      this.minPower,
      this.maxPower
    );

    const percent =
      ((clamped - this.minPower) /
        (this.maxPower - this.minPower)) * 100;

    this.powerFill.style.width = `${percent}%`;
    this.powerText.textContent = clamped.toFixed(2);
  }

  // =====================================
  // 7. ВИДИМОСТЬ
  // =====================================

  public show(): void {
    this.resetStroke();
    this.group.visible = true;
    this.powerPanel.style.display = 'block';
  }

  public hide(): void {
    this.resetStroke();
    this.group.visible = false;
    this.powerPanel.style.display = 'none';
  }

  public dispose(): void {
    this.cue.geometry.dispose();

    const cueMaterial = this.cue.material;

    if (Array.isArray(cueMaterial)) {
      cueMaterial.forEach(m => m.dispose());
    } else {
      cueMaterial.dispose();
    }

    this.aimLine.geometry.dispose();

    const lineMaterial = this.aimLine.material;

    if (Array.isArray(lineMaterial)) {
      lineMaterial.forEach(m => m.dispose());
    } else {
      lineMaterial.dispose();
    }

    this.group.removeFromParent();
    this.powerPanel.remove();
  }
}

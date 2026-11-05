
import * as THREE from 'three';
import { GameHUD } from '../ui/GameHUD';
import { createScene } from '../rendering/Scene';
import {
  createCamera,
  createCameraControls,
} from '../rendering/Camera';
import { createTable } from '../rendering/Table';
import { createBalls } from '../rendering/Balls';
import { ResultScreen } from '../ui/ResultScreen';
import { BALL_RADIUS } from './TableConfig';
import { MatchController } from './MatchController';
import type { GameRules } from './GameRules';
import { CueController } from './CueController';
import { BotController } from '../ai/BotController';
import { PauseMenu } from '../ui/PauseMenu';
import { MainMenu } from '../ui/MainMenu';
import type { ShotResult } from './GameRules';
import {
  PhysicsWorld,
  type BallStartPosition,
} from '../physics/PhysicsWorld';

type CameraMode =
  | 'overview'
  | 'aim'
  | 'stroke'
  | 'simulation'
  | 'placement';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;


private isPaused = false;
private pauseMenu!: PauseMenu;
private mainMenu!: MainMenu;
private isInMainMenu = true;
private resultScreen!: ResultScreen;
private isResultScreenOpen = false;


  private controls: ReturnType<typeof createCameraControls>;

  private physics: PhysicsWorld;
  private match = new MatchController();
  private hud: GameHUD;
  private botController = new BotController();

// Небольшая задержка перед действиями бота.
private botThinkTime = 0;

// Чтобы не выводить одну ошибку каждый кадр.
private botPlanningFailed = false;


private startNewGame(): void {
  console.log('Начинается новая партия');
  // Если открыто окно завершения партии,
// закрываем его перед новой игрой.
this.resultScreen.hide();

this.isResultScreenOpen = false;

  // Закрываем главное меню.
this.mainMenu.hide();

this.isInMainMenu = false;

  // 1. Завершаем текущую игровую активность.
  this.isPaused = true;

  // Не допускаем выполнения отложенного удара.
  this.pendingShot = null;

  this.isAimDragging = false;

  // 2. Сбрасываем состояние бота.
  this.botThinkTime = 0;
  this.botPlanningFailed = false;

  // 3. Создаём нового судью и контроллер матча.
  // Первый игрок снова человек.
  // Группы не назначены.
  this.match = new MatchController();

  // 4. Создаём новую пирамиду и физический мир.
  this.resetRack();

  // 5. Возвращаем режим размещения битка.
  this.enterPlacementMode();

  // 6. Закрываем меню и разрешаем игру.
  this.pauseMenu.hide();

  this.renderer.domElement.style.pointerEvents = '';

  this.isPaused = false;

  // 7. Обновляем интерфейс.
  this.hud.update(
    this.match.getSnapshot(),
    this.cameraMode
  );

  console.log('Новая партия готова');
}


// Временный совместимый доступ к судье.
// Старые методы Game.ts продолжат работать.
private get rules(): GameRules {
  return this.match.rules;
}

  // Группа всех визуальных шаров.
  private ballGroup: THREE.Group;

  // Соответствие номера шара и его модели.
  private ballMeshes = new Map<number, THREE.Object3D>();

  // Ссылка на белый шар сохраняется даже
  // после его удаления из игровой сцены.
  private cueBallMesh: THREE.Object3D | null = null;

  // Таймеры физической симуляции.
  private lastTime = 0;
  private accumulator = 0;
  private stoppedTime = 0;

  private readonly settleDelay = 0.15;

  // ------------------------------
  // Управление камерой и ударом
  // ------------------------------

  private cameraMode: CameraMode = 'overview';

  private aimAngle = 0;
  private shotPower = 2.5;

  private cueController: CueController;

// Для управления прицеливанием мышью.
  private isAimDragging = false;
  private lastAimPointerX = 0;

  // Сохраняем положение камеры свободного обзора.
  private overviewPosition = new THREE.Vector3();
  private overviewTarget = new THREE.Vector3();
  private overviewUp = new THREE.Vector3(0, 1, 0);

  // ------------------------------
  // Размещение битка
  // ------------------------------

  private placementPreview: THREE.Mesh | null = null;

  private placementValid = false;

  private placementX = -0.65;
  private placementZ = 0;

  private placementRaycaster = new THREE.Raycaster();

  private placementPlane = new THREE.Plane(
    new THREE.Vector3(0, 1, 0),
    0
  );


private pendingShot: {
  directionX: number;
  directionZ: number;
  power: number;
} | null = null;


  constructor() {
    // Создаём сцену и камеру.
    this.scene = createScene();
    this.cueController = new CueController(this.scene);
    this.camera = createCamera();

    // Создаём рендерер.
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    this.renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    document.body.appendChild(this.renderer.domElement);

    // HUD — отдельный пользовательский интерфейс.
    this.hud = new GameHUD();

    
this.pauseMenu = new PauseMenu({
  onResume: () => {
    this.resumeGame();
  },

  onNewGame: () => {
    this.startNewGame();
  },

  onMainMenu: () => {
    this.showMainMenu();
  },
});


this.mainMenu = new MainMenu({
  onPlay: () => {
    this.startNewGame();
  },
});


this.resultScreen = new ResultScreen({
  onPlayAgain: () => {
    this.startNewGame();
  },

  onMainMenu: () => {
    this.showMainMenu();
  },
});


// При первом открытии страницы
// игрок должен увидеть стартовое меню.
this.isInMainMenu = true;
this.isPaused = true;

this.mainMenu.show();

// Пока отображается меню,
// взаимодействие с 3D-столом запрещено.
this.renderer.domElement.style.pointerEvents = 'none';





    // Управление свободной камерой.
    this.controls = createCameraControls(
      this.camera,
      this.renderer
    );

    // Создаём стол.
    this.scene.add(createTable());

    // Создаём визуальные шары.
    this.ballGroup = createBalls();
    this.scene.add(this.ballGroup);

    const initialBalls: BallStartPosition[] = [];

    for (const object of this.ballGroup.children) {
      const number = object.userData.ballNumber as number;

      this.ballMeshes.set(number, object);

      if (number === 0) {
        this.cueBallMesh = object;
      }

      initialBalls.push({
        number,
        x: object.position.x,
        z: object.position.z,
      });
    }

    // Создаём физический мир.
    this.physics = new PhysicsWorld(initialBalls);

    // ------------------------------
    // Управление мышью
    // ------------------------------

    
// Начало поворота направления удара.
this.renderer.domElement.addEventListener(
  'pointerdown',
  (event) => {
    if (this.cameraMode !== 'aim') return;
    if (event.button !== 0) return;

    event.preventDefault();

    this.isAimDragging = true;
    this.lastAimPointerX = event.clientX;
  }
);

// Изменяем направление только при удержании ЛКМ.
window.addEventListener('pointermove', (event) => {
  if (!this.isAimDragging) return;

  if (this.cameraMode !== 'aim') {
    this.isAimDragging = false;
    return;
  }

  const deltaX =
    event.clientX - this.lastAimPointerX;

  this.lastAimPointerX = event.clientX;

  // Чувствительность поворота.
  const sensitivity = 0.003;

  this.aimAngle += deltaX * sensitivity;

  this.updateAimCamera();
});

// Завершение поворота.
window.addEventListener('pointerup', () => {
  this.isAimDragging = false;
});

// Защита при переключении окна браузера.
window.addEventListener('blur', () => {
  this.isAimDragging = false;
});


    // Движение битка вслед за курсором.
    
    // Движение битка вслед за курсором.
    this.renderer.domElement.addEventListener(
      'pointermove',
      (event) => {
        // Во время хода бота человек
        // не может перемещать биток.
        if (
          this.match.getSnapshot().currentPlayerKind === 'bot'
        ) {
          return;
        }

        if (this.cameraMode !== 'placement') return;

        const point = this.getPlacementPoint(
          event.clientX,
          event.clientY
        );

        if (!point) return;

        this.updatePlacementPreview(
          point.x,
          point.z
        );
      }
    );


    
    // Подтверждение позиции левой кнопкой мыши.
    this.renderer.domElement.addEventListener(
      'pointerdown',
      (event) => {
        // Во время хода бота человек
        // не может подтвердить позицию битка.
        if (
          this.match.getSnapshot().currentPlayerKind === 'bot'
        ) {
          return;
        }

        if (this.cameraMode !== 'placement') return;
        if (event.button !== 0) return;

        event.preventDefault();

        const point = this.getPlacementPoint(
          event.clientX,
          event.clientY
        );

        if (!point) return;

        this.updatePlacementPreview(
          point.x,
          point.z
        );

        this.confirmCueBallPlacement();
      }
    );


    // ------------------------------
    // Управление клавиатурой
    // ------------------------------

    window.addEventListener('keydown', (event) => {

if (event.code === 'Escape') {
  event.preventDefault();

  // Не обрабатываем автоповтор удерживаемой клавиши.
  if (!event.repeat) {
    this.togglePause();
  }

  return;
}

// Во время паузы остальные клавиши
// не управляют игрой.
if (this.isPaused) {
  return;
}


      // В MVP человек управляет только игроком №1.
if (
  this.match.getSnapshot().currentPlayerKind === 'bot'
) {
  if (
    event.code === 'KeyA' ||
    event.code === 'Space' ||
    event.code === 'ArrowUp' ||
    event.code === 'ArrowDown'
  ) {
    event.preventDefault();
  }

  return;
}

      // A — режим прицеливания.
      if (event.code === 'KeyA') {
        if (!event.repeat) {
          this.enterAimMode();
        }

        return;
      }

      // Escape — отмена прицеливания.
      if (event.code === 'Escape') {
        if (this.cameraMode === 'aim') {
          this.exitAimMode();
        }

        return;
      }

      // Регулировка силы удара.
      if (this.cameraMode === 'aim') {
        if (event.code === 'ArrowUp') {
          event.preventDefault();

          this.shotPower = Math.min(
            6,
            this.shotPower + 0.25
          );
          this.cueController.setPower(this.shotPower);

          console.log('Сила удара:', this.shotPower);
          return;
        }

        if (event.code === 'ArrowDown') {
          event.preventDefault();

          this.shotPower = Math.max(
            0.5,
            this.shotPower - 0.25
          );
          this.cueController.setPower(this.shotPower);

          console.log('Сила удара:', this.shotPower);
          return;
        }
      }

      // Space — удар.
      if (event.code !== 'Space') return;

      event.preventDefault();

      if (event.repeat) return;

      // Удар возможен только из режима Aim.
      if (this.cameraMode !== 'aim') {
        console.log('Сначала войди в режим прицеливания');
        return;
      }

      if (!this.physics.allBallsStopped()) return;

      if (!this.rules.canStartShot()) {
        console.warn(
          'Удар заблокирован:',
          this.rules.getPhase(),
          'Ball in hand:',
          this.rules.hasBallInHand()
        );

        return;
      }

      if (!this.physics.getBallPosition(0)) {
        console.warn('Биток отсутствует');
        return;
      }

      
// Запоминаем направление и силу.
// Пока физический удар НЕ выполняем.
this.pendingShot = {
  directionX: Math.cos(this.aimAngle),
  directionZ: Math.sin(this.aimAngle),
  power: this.shotPower,
};

this.isAimDragging = false;

// Начинаем анимацию кия.
this.cueController.beginStroke();

// Переключаемся в состояние анимации.
// Мышь и клавиатура больше не меняют прицел.
this.cameraMode = 'stroke';

console.log('Начался замах кием');
    });

    window.addEventListener(
      'resize',
      () => this.onResize()
    );

    // Перед первым разбоем игрок размещает биток.
    this.enterPlacementMode();
  }

  // =====================================
  // НАСТРОЙКА ОКНА
  // =====================================

  private onResize(): void {
    this.camera.aspect =
      window.innerWidth / window.innerHeight;

    this.camera.updateProjectionMatrix();

    this.renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }

  // =====================================
  // СОХРАНЕНИЕ И ВОССТАНОВЛЕНИЕ КАМЕРЫ
  // =====================================

  private saveOverviewCamera(): void {
    this.overviewPosition.copy(this.camera.position);
    this.overviewTarget.copy(this.controls.target);
    this.overviewUp.copy(this.camera.up);
  }

  private restoreOverviewCamera(): void {
    this.cameraMode = 'overview';

    this.camera.up.copy(this.overviewUp);
    this.camera.position.copy(this.overviewPosition);

    this.controls.target.copy(this.overviewTarget);
    this.controls.enabled = true;

    this.controls.update();
  }

  // =====================================
  // РЕЖИМ ПРИЦЕЛИВАНИЯ
  // =====================================

  private getCameraMode(): CameraMode {
  return this.cameraMode;
}

  private enterAimMode(): void {
    if (this.cameraMode !== 'overview') return;

    if (!this.rules.canStartShot()) return;

    if (!this.physics.allBallsStopped()) return;

    const cueBall = this.physics.getBallPosition(0);
    if (!cueBall) return;

    // Запоминаем положение свободной камеры.
    this.saveOverviewCamera();

    this.cameraMode = 'aim';
    this.controls.enabled = false;

    this.updateAimCamera();

    this.cueController.setPower(this.shotPower);
    this.cueController.show();
  }

  private exitAimMode(): void {
    if (this.cameraMode !== 'aim') return;

    this.isAimDragging = false;
    this.cueController.hide();
    this.restoreOverviewCamera();
  }

  private updateAimCamera(): void {
    if (this.cameraMode !== 'aim') return;

    const cueBall = this.physics.getBallPosition(0);
    if (!cueBall) return;

    const dx = Math.cos(this.aimAngle);
    const dz = Math.sin(this.aimAngle);

    const distance = 0.65;

    // Камера за битком.
    this.camera.position.set(
      cueBall.x - dx * distance,
      0.38,
      cueBall.z - dz * distance
    );

    // Смотрим через биток по направлению удара.
    this.camera.lookAt(
      cueBall.x + dx * 0.8,
      0.05,
      cueBall.z + dz * 0.8
    );
    
// Получаем координаты оставшихся прицельных шаров.
const targetBalls: Array<{ x: number; z: number }> = [];

for (let number = 1; number <= 15; number++) {
  const position = this.physics.getBallPosition(number);

  if (!position) continue;

  targetBalls.push({
    x: position.x,
    z: position.z,
  });
}

// Обновляем кий и точку первого препятствия.
this.cueController.update(
  cueBall.x,
  cueBall.z,
  this.aimAngle,
  targetBalls
);


  }

  // =====================================
  // РЕЖИМ РАЗМЕЩЕНИЯ БИТКА
  // =====================================



  private createPlacementPreview(): void {
    if (this.placementPreview) return;

    const geometry = new THREE.SphereGeometry(
      BALL_RADIUS,
      32,
      16
    );

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    this.placementPreview = new THREE.Mesh(
      geometry,
      material
    );

    this.placementPreview.renderOrder = 10;
    this.placementPreview.visible = false;

    this.scene.add(this.placementPreview);
  }

  private enterPlacementMode(): void {
    this.isAimDragging = false;
    this.cueController.hide();
    if (this.cameraMode === 'placement') return;

    // Если переходим из свободного обзора,
    // сохраняем положение камеры.
    if (this.cameraMode === 'overview') {
      this.saveOverviewCamera();
    }

    this.cameraMode = 'placement';

    this.controls.enabled = false;

    this.createPlacementPreview();

    // Камера строго сверху.
    this.camera.up.set(0, 0, -1);

    this.camera.position.set(0, 3.2, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();

    // Начальная точка предпросмотра.
    this.placementX = -0.65;
    this.placementZ = 0;

    // Скрываем настоящий биток.
    if (this.cueBallMesh) {
      this.cueBallMesh.visible = false;
    }

    this.updatePlacementPreview(
      this.placementX,
      this.placementZ
    );

    console.log(
      'Placement: перемести биток мышью и нажми ЛКМ'
    );
  }

  private exitPlacementMode(): void {
    if (this.cameraMode !== 'placement') return;

    if (this.placementPreview) {
      this.placementPreview.visible = false;
    }

    if (this.cueBallMesh) {
      this.cueBallMesh.visible = true;
    }

    this.restoreOverviewCamera();
  }

  // Получаем точку на столе под курсором.
  private getPlacementPoint(
    clientX: number,
    clientY: number
  ): THREE.Vector3 | null {
    const rect =
      this.renderer.domElement.getBoundingClientRect();

    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }

    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    this.placementRaycaster.setFromCamera(
      mouse,
      this.camera
    );

    const point = new THREE.Vector3();

    const intersection =
      this.placementRaycaster.ray.intersectPlane(
        this.placementPlane,
        point
      );

    return intersection ? point : null;
  }

  // Обновляем полупрозрачный биток.
  private updatePlacementPreview(
    x: number,
    z: number
  ): void {
    if (!this.placementPreview) return;

    const openingBreak =
      this.rules.getPhase() === 'break';

    this.placementX = x;
    this.placementZ = z;

    this.placementValid =
      this.physics.canPlaceCueBall(
        x,
        z,
        openingBreak
      );

    this.placementPreview.position.set(
      x,
      BALL_RADIUS,
      z
    );

    const material =
      this.placementPreview.material as
        THREE.MeshBasicMaterial;

    material.color.set(
      this.placementValid ? 0xffffff : 0xff4545
    );

    this.placementPreview.visible = true;
  }

  private confirmCueBallPlacement(): void {
    if (this.cameraMode !== 'placement') return;

    if (!this.placementValid) {
      console.warn('Недопустимая позиция битка');
      return;
    }

    const openingBreak =
      this.rules.getPhase() === 'break';

    const success = this.physics.placeCueBall(
      this.placementX,
      this.placementZ,
      openingBreak
    );

    if (!success) {
      console.warn('Физика отклонила размещение');
      return;
    }

    // Восстанавливаем графическую модель битка.
    if (this.cueBallMesh) {
      this.cueBallMesh.position.set(
        this.placementX,
        BALL_RADIUS,
        this.placementZ
      );

      if (!this.cueBallMesh.parent) {
        this.ballGroup.add(this.cueBallMesh);
      }

      this.cueBallMesh.visible = true;

      this.ballMeshes.set(0, this.cueBallMesh);
    }

    // После фола разрешаем следующий удар.
    this.match.confirmCueBallPlacement();

    this.exitPlacementMode();

    console.log(
      'Биток установлен:',
      this.placementX,
      this.placementZ
    );
  }

  // =====================================
  // ПОЛУЧЕНИЕ СОБЫТИЙ ФИЗИКИ
  // =====================================

  private processPhysicsEvents(): void {
    const events = this.physics.consumeEvents();

    for (const event of events) {
      // Передаём событие игровому судье.
      this.rules.handlePhysicsEvent(event);

      if (
        event.type !== 'ball-pocketed' &&
        event.type !== 'ball-out-of-bounds'
      ) {
        continue;
      }

      const number = event.ballNumber;
      const mesh = this.ballMeshes.get(number);

      if (mesh) {
        // Убираем шар со сцены, но не уничтожаем
        // его графические ресурсы.
        mesh.parent?.remove(mesh);
        this.ballMeshes.delete(number);
      }

      if (event.type === 'ball-pocketed') {
        console.log(
          `Шар №${number} забит в лузу №${event.pocketId}`
        );
      } else {
        console.log(
          `Шар №${number} вылетел за пределы стола`
        );
      }
    }
  }

  // =====================================
  // ПОВТОРНЫЙ РАЗБОЙ
  // =====================================

  private resetRack(): void {
    console.log('Восстановление пирамиды...');

    this.scene.remove(this.ballGroup);

    // Собираем уникальные графические ресурсы.
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();

    this.ballGroup.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      geometries.add(object.geometry);

      const meshMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      for (const material of meshMaterials) {
        materials.add(material);
      }
    });

    // Учитываем также ранее удалённый биток,
    // поскольку его может уже не быть в группе.
    if (this.cueBallMesh instanceof THREE.Mesh) {
      geometries.add(this.cueBallMesh.geometry);

      const cueMaterials = Array.isArray(
        this.cueBallMesh.material
      )
        ? this.cueBallMesh.material
        : [this.cueBallMesh.material];

      for (const material of cueMaterials) {
        materials.add(material);
      }
    }

    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => {
  if (material instanceof THREE.MeshStandardMaterial) {
    material.map?.dispose();
  }

  material.dispose();
});

    // Удаляем старую физику.
    this.physics.dispose();

    this.ballMeshes.clear();
    this.cueBallMesh = null;

    // Заново создаём визуальные шары.
    this.ballGroup = createBalls();
    this.scene.add(this.ballGroup);

    const initialBalls: BallStartPosition[] = [];

    for (const object of this.ballGroup.children) {
      const number = object.userData.ballNumber as number;

      this.ballMeshes.set(number, object);

      if (number === 0) {
        this.cueBallMesh = object;
      }

      initialBalls.push({
        number,
        x: object.position.x,
        z: object.position.z,
      });
    }

    // Новый физический мир без старых скоростей.
    this.physics = new PhysicsWorld(initialBalls);

    this.accumulator = 0;
    this.stoppedTime = 0;

    console.log('Пирамида восстановлена');
  }

  // =====================================
  // ЗАВЕРШЕНИЕ УДАРА
  // =====================================


private updateStroke(delta: number): void {
  if (this.cameraMode !== 'stroke') return;

  const hitMoment = this.cueController.updateStroke(
    delta
  );

  if (!hitMoment) return;

  const shot = this.pendingShot;

  // Защита от некорректного состояния.
  if (!shot) {
    this.cueController.hide();
    this.restoreOverviewCamera();
    return;
  }

  this.pendingShot = null;

  // Дополнительная проверка перед ударом.
  if (
    !this.physics.allBallsStopped() ||
    !this.physics.getBallPosition(0) ||
    !this.match.startShot()
  ) {
    this.cueController.hide();
    this.restoreOverviewCamera();

    console.warn('Не удалось выполнить удар');
    return;
  }

  this.stoppedTime = 0;

  // Физический удар происходит именно
  // при визуальном контакте кия с битком.
  this.physics.hitCueBall(
    shot.directionX,
    shot.directionZ,
    shot.power
  );

  // Скрываем кий после контакта.
  this.cueController.hide();

  // Теперь начинается движение шаров.
  this.cameraMode = 'simulation';

  console.log(
    'Физический удар выполнен:',
    shot
  );
}


  private updateShotState(delta: number): void {
    if (!this.rules.isShotActive()) return;

    if (!this.physics.allBallsStopped()) {
      this.stoppedTime = 0;
      return;
    }

    this.stoppedTime += delta;

    if (this.stoppedTime < this.settleDelay) {
      return;
    }

    this.stoppedTime = 0;

    const outcome = this.match.completeShot();
    if (!outcome) return;

// ========================================
// Завершение партии: победа или поражение
// ========================================

if (outcome.gameFinished) {
  const winnerId = outcome.shot.winnerId;

  if (winnerId !== null) {
    this.finishGame(
      outcome.shot,
      winnerId
    );

    return;
  }
}


    const result = outcome.shot;

    // Возвращаем свободную камеру после удара.
    if (this.cameraMode === 'simulation') {
      this.restoreOverviewCamera();
    }

    console.log('===== ИТОГ УДАРА =====');

    console.log('Игрок:', result.playerId);
    console.log('Первый контакт:', result.firstContact);
    console.log('Забитые шары:', result.pocketedBalls);
    console.log('Фаза партии:', result.phase);

    if (result.isFoul) {
      console.warn('Фол:', result.foulReasons);
    }

    if (result.assignedGroup !== null) {
      console.log(
        'Назначена группа:',
        result.assignedGroup
      );
    }

    if (result.phase === 'open') {
      console.log('Стол открыт');
    }

    if (result.winnerId !== null) {
      console.log(
        'ПОБЕДИТЕЛЬ: игрок',
        result.winnerId
      );
      return;
    }

    // После неправильного разбоя:
    // восстанавливаем пирамиду и размещаем биток.
    
if (outcome.resetRack) {
  this.resetRack();

  if (outcome.placementRequired) {
    this.enterPlacementMode();
  }

  console.log(
    'Повторный разбой. Ход игрока:',
    this.match.getSnapshot().currentPlayerId
  );

  return;
}


    // После обычного фола:
    // включаем режим ручного размещения.
    if (outcome.placementRequired) {
  console.log(
    'Ball in hand. Ход игрока:',
    this.match.getSnapshot().currentPlayerId
  );

  this.enterPlacementMode();
  return;
}

    console.log(
      'Следующий игрок:',
      result.nextPlayerId
    );
  }

  // =====================================
  // ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ
  // =====================================


private updateBotTurn(delta: number): void {
  const snapshot = this.match.getSnapshot();

  // Бот управляет только игроком №2.
  if (
    snapshot.currentPlayerKind !== 'bot' ||
    snapshot.phase === 'finished' ||
    snapshot.shotActive
  ) {
    this.botThinkTime = 0;
    this.botPlanningFailed = false;
    return;
  }

  // Пока идёт замах или физическая симуляция,
  // никаких новых действий не начинаем.
  if (
    this.cameraMode === 'stroke' ||
    this.cameraMode === 'simulation' ||
    this.cameraMode === 'aim'
  ) {
    return;
  }

  if (this.botPlanningFailed) return;

  this.botThinkTime += delta;

  // Задержка перед принятием решения.
  if (this.botThinkTime < 0.7) return;

  this.botThinkTime = 0;

  // =====================================
  // 1. Размещение битка ботом
  // =====================================

  if (this.cameraMode === 'placement') {
    const openingBreak = snapshot.phase === 'break';

    const position =
      this.botController.chooseCueBallPosition(
        this.physics,
        openingBreak
      );

    if (!position) {
      console.error(
        'Бот не нашёл допустимую позицию битка'
      );

      this.botPlanningFailed = true;
      return;
    }

    // Используем ту же механику размещения,
    // которая уже существует для человека.
    this.updatePlacementPreview(
      position.x,
      position.z
    );

    this.confirmCueBallPlacement();

    console.log(
      'Бот разместил биток:',
      position
    );

    return;
  }

  // =====================================
  // 2. Планирование удара
  // =====================================

  if (this.cameraMode !== 'overview') return;

  if (!this.physics.allBallsStopped()) return;

  if (!this.match.canStartShot()) return;

  const plannedShot =
    this.botController.planShot(
      snapshot,
      this.physics
    );

  if (!plannedShot) {
    console.error(
      'Бот не смог спланировать удар'
    );

    this.botPlanningFailed = true;
    return;
  }

  // =====================================
  // 3. Запуск стандартной анимации Stroke
  // =====================================

  this.aimAngle = Math.atan2(
    plannedShot.directionZ,
    plannedShot.directionX
  );

  this.shotPower = plannedShot.power;

  // Переходим к уже существующей камере
  // прицеливания и показываем кий.
  
this.enterAimMode();

// Получаем фактический режим камеры после
// выполнения метода enterAimMode().
const currentMode: CameraMode = this.getCameraMode();

if (currentMode !== 'aim') {
  console.error(
    'Бот не смог перейти в режим Aim'
  );

  this.botPlanningFailed = true;
  return;
}


  this.updateAimCamera();

  this.cueController.setPower(this.shotPower);

  // Сохраняем параметры будущего удара.
  // Физика начнётся после анимации кия.
  this.pendingShot = {
    directionX: plannedShot.directionX,
    directionZ: plannedShot.directionZ,
    power: plannedShot.power,
  };

  this.isAimDragging = false;

  this.cueController.beginStroke();
  this.cameraMode = 'stroke';

  console.log('Бот выполняет удар:', plannedShot);
}


private finishGame(
  shot: ShotResult,
  winnerId: number
): void {
  if (this.isResultScreenOpen) return;

  // Останавливаем все игровые обновления.
  this.isPaused = true;

  // Запрещаем действия с игровым столом.
  this.renderer.domElement.style.pointerEvents = 'none';

  // Скрываем другие модальные интерфейсы.
  this.pauseMenu.hide();
  this.mainMenu.hide();

  this.isResultScreenOpen = true;

  this.resultScreen.show({
    winnerId,
    lastShot: shot,
  });

  console.log(
    'Матч завершён. Победитель:',
    winnerId
  );
}


private showMainMenu(): void {
  // Останавливаем игровую симуляцию.
  this.isPaused = true;
  // Закрываем окно результата.
this.resultScreen.hide();

this.isResultScreenOpen = false;

  // Переключаем состояние интерфейса.
  this.isInMainMenu = true;

  // Закрываем паузу, открываем главное меню.
  this.pauseMenu.hide();
  this.mainMenu.show();

  // Запрещаем взаимодействие со столом.
  this.renderer.domElement.style.pointerEvents = 'none';

  console.log('Открыто главное меню');
}


private pauseGame(): void {
  if (this.isPaused) return;

  this.isPaused = true;

  this.pauseMenu.show();

  // Запрещаем взаимодействие со столом.
  this.renderer.domElement.style.pointerEvents = 'none';

  console.log('Игра приостановлена');
}

private resumeGame(): void {
  if (!this.isPaused) return;

  this.isPaused = false;

  this.pauseMenu.hide();

  this.renderer.domElement.style.pointerEvents = '';

  console.log('Игра продолжена');
}

private togglePause(): void {
  // На главном экране и экране результата
  // клавиша Esc не открывает паузу.
  if (
    this.isInMainMenu ||
    this.isResultScreenOpen
  ) {
    return;
  }

  if (this.isPaused) {
    this.resumeGame();
  } else {
    this.pauseGame();
  }
}

  public start(): void {
    this.lastTime = performance.now();

    this.renderer.setAnimationLoop((timestamp) => {
      const delta = Math.min(
        (timestamp - this.lastTime) / 1000,
        0.05
      );

      if (this.isPaused) {
  return;
}

      this.lastTime = timestamp;
      // Обновляем визуальную анимацию удара.
// При достижении битка здесь запускается физика.
this.updateStroke(delta);
      this.accumulator += delta;

      // Физика с фиксированным шагом.
      while (
        this.accumulator >= this.physics.fixedTimeStep
      ) {
        this.physics.step();

        this.accumulator -= this.physics.fixedTimeStep;
      }

      // Получаем события физики и проверяем правила.
      this.processPhysicsEvents();
      this.updateShotState(delta);
      // Проверяем, не наступил ли ход бота.
      // Если наступил — запускаем его действия.
      this.updateBotTurn(delta);

      // Получаем актуальное состояние партии.
      const snapshot = this.match.getSnapshot();

      // Обновляем игровой интерфейс.
      this.hud.update(snapshot, this.cameraMode);

      // Синхронизируем положение графических шаров.
      for (const [number, mesh] of this.ballMeshes) {
        const position =
          this.physics.getBallPosition(number);

        if (!position) continue;

        mesh.position.set(
          position.x,
          position.y,
          position.z
        );
      }

      // OrbitControls обновляем только
      // в режиме свободного обзора.
      if (this.cameraMode === 'overview') {
        this.controls.update();
      }

      this.renderer.render(
        this.scene,
        this.camera
      );
    });
  }
}

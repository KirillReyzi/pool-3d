
import {
  GameRules,
  type MatchPhase,
  type PlayerState,
  type ShotResult,
} from './GameRules';

// Пока только два вида участников.
// В будущем сюда можно добавить online-player.
export type PlayerKind = 'human' | 'bot';

export interface MatchSnapshot {
  currentPlayerId: number;
  currentPlayerKind: PlayerKind;
  phase: MatchPhase;
  players: PlayerState[];
  remainingBalls: number[];
  winnerId: number | null;
  ballInHand: boolean;
  shotActive: boolean;
}

export interface MatchOutcome {
  shot: ShotResult;

  // Нужно ли восстановить пирамиду.
  resetRack: boolean;

  // Нужно ли включить размещение битка.
  placementRequired: boolean;

  // Партия завершилась победой одного игрока.
  gameFinished: boolean;
}

/**
 * Управляет жизненным циклом одной партии.
 *
 * GameRules — судья.
 * MatchController — организатор партии.
 *
 * Физику и графику этот класс не затрагивает.
 */
export class MatchController {
  public readonly rules: GameRules;

  private readonly playerKinds = new Map<
    number,
    PlayerKind
  >([
    [1, 'human'],
    [2, 'bot'],
  ]);

  constructor() {
    this.rules = new GameRules();
  }

  /**
   * Возвращает актуальное состояние партии.
   * Пригодится для игрового HUD и бота.
   */
  public getSnapshot(): MatchSnapshot {
    const currentPlayerId =
      this.rules.getCurrentPlayer();

    return {
      currentPlayerId,

      currentPlayerKind:
        this.playerKinds.get(currentPlayerId) ?? 'human',

      phase: this.rules.getPhase(),

      players: this.rules.getPlayers(),

      remainingBalls: this.rules.getRemainingBalls(),

      winnerId: this.rules.getWinner(),

      ballInHand: this.rules.hasBallInHand(),

      shotActive: this.rules.isShotActive(),
    };
  }

  /**
   * Разрешает начать удар.
   *
   * Пока используется и человеком, и при тестировании
   * второго игрока через клавиатуру.
   */
  public startShot(): boolean {
    return this.rules.startShot();
  }

  /**
   * Завершает удар и решает,
   * какое действие должно произойти далее.
   */
  public completeShot(): MatchOutcome | null {
    const result = this.rules.finishShot();

    if (!result) return null;

    // Если партия окончена, никакие дополнительные
    // переходы выполнять нельзя.
    if (result.winnerId !== null) {
      return {
        shot: result,
        resetRack: false,
        placementRequired: false,
        gameFinished: true,
      };
    }

    // Для MVP автоматически передаём право
    // повторного разбоя другому игроку.
    if (result.breakNeedsDecision) {
      const prepared = this.rules.prepareRebreak();

      return {
        shot: result,
        resetRack: prepared,
        placementRequired: prepared,
        gameFinished: false,
      };
    }

    // После обычного фола соперник
    // самостоятельно размещает биток.
    return {
      shot: result,
      resetRack: false,
      placementRequired: result.ballInHand,
      gameFinished: false,
    };
  }

  /**
   * Подтверждает размещение битка.
   *
   * Вызывать только после успешной проверки
   * и перемещения в PhysicsWorld.
   */
  public confirmCueBallPlacement(): void {
    if (this.rules.hasBallInHand()) {
      this.rules.confirmBallInHand();
    }
  }

  public canStartShot(): boolean {
    return this.rules.canStartShot();
  }
}

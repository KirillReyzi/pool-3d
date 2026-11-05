
import type { PhysicsEvent } from '../physics/PhysicsWorld';

export type BallGroup = 'solids' | 'stripes' | null;

export type MatchPhase =
  | 'break'
  | 'open'
  | 'assigned'
  | 'break-decision'
  | 'finished';

export interface PlayerState {
  id: number;
  group: BallGroup;
}

export interface ShotResult {
  playerId: number;
  nextPlayerId: number;
  firstContact: number | null;
  pocketedBalls: number[];
  outOfBoundsBalls: number[];
  railContacts: number[];
  foulReasons: string[];
  isFoul: boolean;
  cueBallFoul: boolean;
  eightBallPocketed: boolean;
  isBreak: boolean;
  breakNeedsDecision: boolean;
  ballInHand: boolean;
  winnerId: number | null;
  phase: MatchPhase;
  assignedGroup: BallGroup;
}

interface ActiveShot {
  playerId: number;
  isBreak: boolean;
  firstContact: number | null;
  railContacts: Set<number>;
  railsAfterContact: Set<number>;
  pocketed: Map<number, number>;
  outOfBounds: Set<number>;
  eligibleForEight: boolean;
}

function getGroup(number: number): BallGroup {
  if (number >= 1 && number <= 7) return 'solids';
  if (number >= 9 && number <= 15) return 'stripes';
  return null;
}

function oppositeGroup(group: BallGroup): BallGroup {
  if (group === 'solids') return 'stripes';
  if (group === 'stripes') return 'solids';
  return null;
}

export class GameRules {
  private currentPlayer = 1;
  private phase: MatchPhase = 'break';
  private winnerId: number | null = null;
  private ballInHand = false;

  private players: PlayerState[] = [
    { id: 1, group: null },
    { id: 2, group: null },
  ];

  private remainingBalls = new Set<number>(
    Array.from({ length: 15 }, (_, i) => i + 1)
  );

  private activeShot: ActiveShot | null = null;

  private getActivePlayer(): PlayerState {
    return this.players[this.currentPlayer - 1];
  }

  private opponentId(id: number): number {
    return id === 1 ? 2 : 1;
  }

  private isGroupCleared(group: BallGroup): boolean {
    if (group === null) return false;

    for (const number of this.remainingBalls) {
      if (getGroup(number) === group) {
        return false;
      }
    }

    return true;
  }

  public canStartShot(): boolean {
    return (
      this.activeShot === null &&
      !this.ballInHand &&
      this.phase !== 'finished' &&
      this.phase !== 'break-decision'
    );
  }

  public startShot(): boolean {
    if (!this.canStartShot()) return false;

    const player = this.getActivePlayer();

    this.activeShot = {
      playerId: this.currentPlayer,
      isBreak: this.phase === 'break',
      firstContact: null,
      railContacts: new Set(),
      railsAfterContact: new Set(),
      pocketed: new Map(),
      outOfBounds: new Set(),
      eligibleForEight:
        player.group !== null &&
        this.isGroupCleared(player.group),
    };

    return true;
  }

  public handlePhysicsEvent(event: PhysicsEvent): void {
    const shot = this.activeShot;
    if (!shot) return;

    switch (event.type) {
      case 'ball-collision': {
        if (shot.firstContact !== null) break;

        if (event.ballA === 0 && event.ballB !== 0) {
          shot.firstContact = event.ballB;
        } else if (event.ballB === 0 && event.ballA !== 0) {
          shot.firstContact = event.ballA;
        }
        break;
      }

      case 'rail-collision': {
        shot.railContacts.add(event.ballNumber);

        if (shot.firstContact !== null) {
          shot.railsAfterContact.add(event.ballNumber);
        }
        break;
      }

      case 'ball-pocketed': {
        shot.pocketed.set(
          event.ballNumber,
          event.pocketId
        );
        break;
      }

      case 'ball-out-of-bounds': {
        shot.outOfBounds.add(event.ballNumber);
        break;
      }
    }
  }

  public finishShot(): ShotResult | null {
    const shot = this.activeShot;
    if (!shot) return null;

    const player = this.getActivePlayer();

    const pocketedBalls = [...shot.pocketed.keys()];
    const outOfBoundsBalls = [...shot.outOfBounds];

    const objectPocketed = pocketedBalls.filter(
      number => number >= 1 && number <= 15
    );

    const cueBallFoul =
      shot.pocketed.has(0) ||
      shot.outOfBounds.has(0);

    const eightBallPocketed = shot.pocketed.has(8);
    const eightBallOut = shot.outOfBounds.has(8);

    const foulReasons: string[] = [];

    // 1. Базовые фолы
    if (cueBallFoul) {
      foulReasons.push('Биток забит или вылетел');
    }

    if (shot.firstContact === null) {
      foulReasons.push('Нет контакта с прицельным шаром');
    }

    if (outOfBoundsBalls.some(n => n !== 0)) {
      foulReasons.push('Прицельный шар вылетел со стола');
    }

    // 2. Проверка первого контакта
    if (!shot.isBreak && shot.firstContact !== null) {
      const first = shot.firstContact;

      if (player.group === null) {
        // На открытом столе можно сначала
        // коснуться любой группы, кроме восьмёрки.
        if (first === 8) {
          foulReasons.push(
            'Первый контакт с восьмёркой на открытом столе'
          );
        }
      } else if (shot.eligibleForEight) {
        if (first !== 8) {
          foulReasons.push(
            'После очистки группы первой нужна восьмёрка'
          );
        }
      } else {
        if (getGroup(first) !== player.group) {
          foulReasons.push(
            'Первый контакт не со своей группой'
          );
        }
      }

      // 3. После контакта требуется борт
      // или забитие прицельного шара.
      const postContactRail =
        shot.railsAfterContact.size > 0;

      const anyObjectPocketed =
        pocketedBalls.some(n => n !== 0);

      if (!postContactRail && !anyObjectPocketed) {
        foulReasons.push(
          'После контакта нет борта или забития'
        );
      }
    }

    // 4. Отдельная проверка разбоя
    const objectRailContacts = [...shot.railContacts]
      .filter(number => number !== 0);

    
const isFoul = foulReasons.length > 0;

const breakNeedsDecision =
  shot.isBreak &&
  (
    isFoul ||
    (
      objectPocketed.length === 0 &&
      objectRailContacts.length < 4
    ) ||
    eightBallPocketed ||
    eightBallOut
  );


    // 5. Определяем группы забитых шаров
    const solidsPocketed = objectPocketed
      .filter(n => getGroup(n) === 'solids');

    const stripesPocketed = objectPocketed
      .filter(n => getGroup(n) === 'stripes');

    // 6. Удаляем покинувшие игру шары
    for (const number of [
      ...pocketedBalls,
      ...outOfBoundsBalls,
    ]) {
      if (number !== 0) {
        this.remainingBalls.delete(number);
      }
    }

    let assignedGroup: BallGroup = null;
    let winnerId: number | null = null;

    // 7. Восьмёрка при обычном ударе
    if (!shot.isBreak &&
        (eightBallPocketed || eightBallOut)) {
      const legalEight =
        shot.eligibleForEight &&
        eightBallPocketed &&
        !eightBallOut &&
        !isFoul;

      winnerId = legalEight
        ? shot.playerId
        : this.opponentId(shot.playerId);

      this.winnerId = winnerId;
      this.phase = 'finished';
    }

    // 8. Назначение групп на открытом столе
    if (
      !shot.isBreak &&
      this.phase === 'open' &&
      !isFoul
    ) {
      if (
        solidsPocketed.length > 0 &&
        stripesPocketed.length === 0
      ) {
        assignedGroup = 'solids';
      } else if (
        stripesPocketed.length > 0 &&
        solidsPocketed.length === 0
      ) {
        assignedGroup = 'stripes';
      }

      if (assignedGroup !== null) {
        player.group = assignedGroup;

        const opponent = this.players.find(
          p => p.id !== player.id
        );

        if (opponent) {
          opponent.group = oppositeGroup(assignedGroup);
        }

        this.phase = 'assigned';
      }
    }

    // 9. Определяем, сохраняет ли игрок ход
    let continueTurn = false;

    if (!isFoul && this.phase !== 'finished') {
      if (shot.isBreak) {
        // Любой забитый прицельный шар
        // позволяет продолжить после законного разбоя.
        continueTurn = objectPocketed.length > 0;
      } else if (player.group === null) {
        // Открытый стол:
        // одна или обе группы забиты без фола.
        continueTurn = objectPocketed.length > 0;
      } else {
        // После назначения групп продолжаем,
        // только если законно забита своя группа.
        continueTurn = objectPocketed.some(
          n => getGroup(n) === player.group
        );
      }
    }

    // 10. Переключение игроков
    if (this.phase !== 'finished') {
      if (shot.isBreak) {
        this.phase = breakNeedsDecision
          ? 'break-decision'
          : 'open';
      }

      if (!continueTurn || isFoul) {
        this.currentPlayer =
          this.opponentId(this.currentPlayer);
      }

      // Стандартный фол после разбоя
      // даёт право размещения битка.
      // Особые последствия разбоя — отдельно.
      this.ballInHand = !shot.isBreak && isFoul;
    }

    this.activeShot = null;

    return {
      playerId: shot.playerId,
      nextPlayerId: this.currentPlayer,
      firstContact: shot.firstContact,
      pocketedBalls,
      outOfBoundsBalls,
      railContacts: [...shot.railContacts],
      foulReasons,
      isFoul,
      cueBallFoul,
      eightBallPocketed,
      isBreak: shot.isBreak,
      breakNeedsDecision,
      ballInHand: this.ballInHand,
      winnerId,
      phase: this.phase,
      assignedGroup,
    };
  }

  public confirmBallInHand(): void {
    this.ballInHand = false;
  }

  public hasBallInHand(): boolean {
    return this.ballInHand;
  }

  public isShotActive(): boolean {
    return this.activeShot !== null;
  }

  public getCurrentPlayer(): number {
    return this.currentPlayer;
  }

  public getPhase(): MatchPhase {
    return this.phase;
  }

  public getWinner(): number | null {
    return this.winnerId;
  }

  public getRemainingBalls(): number[] {
    return [...this.remainingBalls];
  }

  public getPlayers(): PlayerState[] {
    return this.players.map(player => ({
      ...player,
    }));
  }


public prepareRebreak(): boolean {
  // Повторный разбой разрешён только после
  // специального решения судьи.
  if (this.phase !== 'break-decision') {
    return false;
  }

  // Возвращаем начальную фазу партии.
  this.phase = 'break';

  // Сбрасываем состояние удара.
  this.activeShot = null;

  // Убираем право ball in hand.
  this.ballInHand = false;

  // На столе снова находятся все 15
  // прицельных шаров.
  this.remainingBalls = new Set(
    Array.from({ length: 15 }, (_, i) => i + 1)
  );

  // Сбрасываем группы игроков.
  for (const player of this.players) {
    player.group = null;
  }

  // Предыдущий разбой не завершил партию.
  this.winnerId = null;

  // currentPlayer НЕ изменяем:
  // при неудачном разбое он уже переключён
  // в finishShot() на следующего игрока.

  return true;
}


}

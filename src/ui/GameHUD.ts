
import type {
  MatchSnapshot,
} from '../game/MatchController';

type CameraMode =
  | 'overview'
  | 'aim'
  | 'stroke'
  | 'simulation'
  | 'placement';

interface PlayerElements {
  card: HTMLDivElement;
  group: HTMLDivElement;
  balls: HTMLDivElement;
}

const BALL_COLORS = [
  '#f1ce32',
  '#2455b8',
  '#c52d32',
  '#693ba0',
  '#e87923',
  '#23804a',
  '#81312a',
];

export class GameHUD {
  private root: HTMLDivElement;

  private human: PlayerElements;
  private bot: PlayerElements;

  private statusTitle: HTMLDivElement;
  private statusHint: HTMLDivElement;

  private lastRenderKey = '';

  constructor() {
    // Основной контейнер поверх Canvas.
    this.root = document.createElement('div');

    Object.assign(this.root.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      boxSizing: 'border-box',
      padding: '18px 24px',
      zIndex: '50',
      pointerEvents: 'none',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    });

    // Панель с двумя игроками.
    const topPanel = document.createElement('div');

    Object.assign(topPanel.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '16px',
      width: '100%',
    });

    this.human = this.createPlayerCard(
      'ИГРОК',
      'Вы'
    );

    this.bot = this.createPlayerCard(
      'СОПЕРНИК',
      'Бот'
    );

    topPanel.append(
      this.human.card,
      this.bot.card
    );

    // Информационная панель состояния.
    const statusPanel = document.createElement('div');

    Object.assign(statusPanel.style, {
      margin: '16px auto 0',
      padding: '10px 20px',
      width: 'fit-content',
      maxWidth: '440px',
      textAlign: 'center',
      background: 'rgba(13, 27, 21, 0.88)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: '12px',
      boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
    });

    this.statusTitle = document.createElement('div');

    Object.assign(this.statusTitle.style, {
      fontSize: '17px',
      fontWeight: 'bold',
      marginBottom: '5px',
    });

    this.statusHint = document.createElement('div');

    Object.assign(this.statusHint.style, {
      fontSize: '12px',
      color: '#c5d7cd',
      lineHeight: '1.5',
    });

    statusPanel.append(
      this.statusTitle,
      this.statusHint
    );

    this.root.append(
      topPanel,
      statusPanel
    );

    document.body.appendChild(this.root);
  }

  private createPlayerCard(
    heading: string,
    name: string
  ): PlayerElements {
    const card = document.createElement('div');

    Object.assign(card.style, {
      width: '230px',
      minHeight: '90px',
      boxSizing: 'border-box',
      background: 'rgba(13, 27, 21, 0.88)',
      border: '2px solid transparent',
      borderRadius: '12px',
      padding: '12px 14px',
      boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
    });

    const headingElement =
      document.createElement('div');

    headingElement.textContent = heading;

    Object.assign(headingElement.style, {
      fontSize: '10px',
      letterSpacing: '1.5px',
      color: '#a9bdb0',
    });

    const nameElement = document.createElement('div');

    nameElement.textContent = name;

    Object.assign(nameElement.style, {
      fontSize: '19px',
      fontWeight: 'bold',
      marginTop: '5px',
      marginBottom: '8px',
    });

    const group = document.createElement('div');

    Object.assign(group.style, {
      fontSize: '12px',
      color: '#d0dfd6',
      marginBottom: '10px',
    });

    const balls = document.createElement('div');

    Object.assign(balls.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '5px',
      minHeight: '23px',
    });

    card.append(
      headingElement,
      nameElement,
      group,
      balls
    );

    return { card, group, balls };
  }

  private renderPlayer(
    elements: PlayerElements,
    playerId: number,
    snapshot: MatchSnapshot
  ): void {
    const player = snapshot.players.find(
      p => p.id === playerId
    );

    const active =
      snapshot.currentPlayerId === playerId &&
      snapshot.phase !== 'finished';

    elements.card.style.borderColor = active
      ? '#d7b963'
      : 'transparent';

    elements.card.style.background = active
      ? 'rgba(31, 62, 43, 0.94)'
      : 'rgba(13, 27, 21, 0.88)';

    if (!player || player.group === null) {
      elements.group.textContent =
        'Группа не назначена';

      elements.balls.replaceChildren();
      return;
    }

    elements.group.textContent =
      player.group === 'solids'
        ? 'Сплошные · 1–7'
        : 'Полосатые · 9–15';

    const startNumber =
      player.group === 'solids' ? 1 : 9;

    const remaining = new Set(
      snapshot.remainingBalls
    );

    const fragments = document.createDocumentFragment();

    for (let i = 0; i < 7; i++) {
      const number = startNumber + i;

      const ball = document.createElement('div');

      const color = BALL_COLORS[i];

      Object.assign(ball.style, {
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        border: '1px solid rgba(255,255,255,0.65)',
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#111111',
        opacity: remaining.has(number) ? '1' : '0.22',
        background:
          player.group === 'solids'
            ? color
            : `linear-gradient(
                to bottom,
                #ffffff 0%,
                #ffffff 27%,
                ${color} 27%,
                ${color} 73%,
                #ffffff 73%,
                #ffffff 100%
              )`,
      });

      ball.textContent = String(number);
      ball.title = remaining.has(number)
        ? `Шар №${number} на столе`
        : `Шар №${number} забит`;

      fragments.appendChild(ball);
    }

    // После очистки группы показываем,
    // что игроку осталось забить восьмёрку.
    const groupCleared = Array.from(
      { length: 7 },
      (_, i) => startNumber + i
    ).every(n => !remaining.has(n));

    if (
      groupCleared &&
      remaining.has(8)
    ) {
      elements.group.textContent += ' · Цель: №8';
    }

    elements.balls.replaceChildren(fragments);
  }

  private getStatus(
    snapshot: MatchSnapshot,
    mode: CameraMode
  ): { title: string; hint: string } {
    if (snapshot.winnerId !== null) {
      return snapshot.winnerId === 1
        ? {
            title: 'Победа!',
            hint: 'Вы выиграли партию.',
          }
        : {
            title: 'Поражение',
            hint: 'Бот выиграл партию.',
          };
    }

    if (snapshot.phase === 'break-decision') {
      return {
        title: 'Проверка разбоя',
        hint: 'Подготавливается повторный разбой.',
      };
    }

    const isBot = snapshot.currentPlayerKind === 'bot';

    if (isBot) {
      if (mode === 'placement') {
        return {
          title: 'Бот размещает биток',
          hint: 'Ожидание следующего удара.',
        };
      }

      if (mode === 'stroke') {
        return {
          title: 'Бот наносит удар',
          hint: 'Выполняется замах кием.',
        };
      }

      if (mode === 'simulation') {
        return {
          title: 'Ход бота',
          hint: 'Шары движутся.',
        };
      }

      return {
        title: 'Ход бота',
        hint: 'Компьютер выбирает следующий удар.',
      };
    }

    if (mode === 'placement') {
      return {
        title:
          snapshot.phase === 'break'
            ? 'Подготовка к разбою'
            : 'Размещение битка',
        hint: 'Переместите биток мышью и нажмите ЛКМ.',
      };
    }

    if (mode === 'aim') {
      return {
        title: 'Прицеливание',
        hint:
          'Удерживайте ЛКМ для поворота. ' +
          '↑/↓ — сила. Space — удар.',
      };
    }

    if (mode === 'stroke') {
      return {
        title: 'Выполняется удар',
        hint: 'Кий движется к битку.',
      };
    }

    if (mode === 'simulation') {
      return {
        title: 'Шары движутся',
        hint: 'Дождитесь завершения удара.',
      };
    }

    return {
      title: 'Ваш ход',
      hint: 'Нажмите A для прицеливания.',
    };
  }

  /**
   * Получает состояние партии и
   * обновляет интерфейс при изменениях.
   */
  public update(
    snapshot: MatchSnapshot,
    mode: CameraMode
  ): void {
    const renderKey = JSON.stringify({
      currentPlayerId: snapshot.currentPlayerId,
      phase: snapshot.phase,
      winnerId: snapshot.winnerId,
      ballInHand: snapshot.ballInHand,
      shotActive: snapshot.shotActive,
      players: snapshot.players,
      remainingBalls: snapshot.remainingBalls,
      mode,
    });

    // Не перестраиваем DOM, если информация
    // с прошлого кадра не изменилась.
    if (renderKey === this.lastRenderKey) return;

    this.lastRenderKey = renderKey;

    this.renderPlayer(this.human, 1, snapshot);
    this.renderPlayer(this.bot, 2, snapshot);

    const status = this.getStatus(snapshot, mode);

    this.statusTitle.textContent = status.title;
    this.statusHint.textContent = status.hint;
  }

  public dispose(): void {
    this.root.remove();
  }
}

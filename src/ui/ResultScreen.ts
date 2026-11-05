
import type { ShotResult } from '../game/GameRules';

export interface MatchResultData {
  winnerId: number;
  lastShot: ShotResult;
}

export interface ResultScreenActions {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export class ResultScreen {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly description: HTMLParagraphElement;
  private readonly reason: HTMLDivElement;

  constructor(actions: ResultScreenActions) {
    this.root = document.createElement('div');

    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '150',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      background: 'rgba(5, 14, 9, 0.84)',
      backdropFilter: 'blur(8px)',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      pointerEvents: 'auto',
    });

    const panel = document.createElement('div');

    Object.assign(panel.style, {
      width: 'min(420px, 100%)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '34px',
      borderRadius: '18px',
      background: '#193323',
      border: '1px solid #54705a',
      boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
      textAlign: 'center',
    });

    this.title = document.createElement('h1');

    Object.assign(this.title.style, {
      margin: '0',
      fontSize: '32px',
      letterSpacing: '2px',
      color: '#e8c77b',
    });

    this.description = document.createElement('p');

    Object.assign(this.description.style, {
      margin: '0',
      fontSize: '15px',
      lineHeight: '1.6',
      color: '#dce8dc',
    });

    this.reason = document.createElement('div');

    Object.assign(this.reason.style, {
      padding: '14px',
      borderRadius: '10px',
      background: '#11271a',
      color: '#dce8dc',
      fontSize: '13px',
      lineHeight: '1.6',
      whiteSpace: 'pre-line',
    });

    const playAgain = this.createButton(
      'Играть ещё',
      true
    );

    const mainMenu = this.createButton(
      'В главное меню',
      false
    );

    playAgain.addEventListener(
      'click',
      actions.onPlayAgain
    );

    mainMenu.addEventListener(
      'click',
      actions.onMainMenu
    );

    panel.append(
      this.title,
      this.description,
      this.reason,
      playAgain,
      mainMenu
    );

    this.root.appendChild(panel);
    document.body.appendChild(this.root);
  }

  private createButton(
    label: string,
    primary: boolean
  ): HTMLButtonElement {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = label;

    Object.assign(button.style, {
      width: '100%',
      padding: '14px 16px',
      borderRadius: '9px',
      border: primary
        ? '1px solid #e7c77c'
        : '1px solid #55745b',
      background: primary
        ? '#e7c77c'
        : '#304e38',
      color: primary ? '#19251b' : '#ffffff',
      fontSize: '15px',
      fontWeight: 'bold',
      cursor: 'pointer',
    });

    return button;
  }

  private getReason(data: MatchResultData): string {
    const shot = data.lastShot;

    const eightPocketed = shot.eightBallPocketed;

    const eightOut =
      shot.outOfBoundsBalls.includes(8);

    // Законная победа восьмёркой.
    if (
      data.winnerId === shot.playerId &&
      eightPocketed &&
      !shot.isFoul
    ) {
      return 'Шар №8 забит без нарушения правил.';
    }

    // Если проигравший забил восьмёрку,
    // уточняем, что произошло.
    if (
      data.winnerId !== shot.playerId &&
      eightPocketed
    ) {
      const details: string[] = [
        'Шар №8 забит с нарушением условий победы.',
      ];

      if (
        shot.firstContact !== null &&
        shot.firstContact !== 8
      ) {
        details.push(
          `Первое касание — шар №${shot.firstContact}, ` +
          'а не №8.'
        );
      }

      if (shot.foulReasons.length > 0) {
        details.push(
          'Нарушения: ' +
          shot.foulReasons.join('; ')
        );
      }

      if (
        shot.foulReasons.length === 0 &&
        shot.firstContact === 8
      ) {
        details.push(
          'Восьмёрка забита до выполнения ' +
          'условий законной победы.'
        );
      }

      return details.join('\n');
    }

    if (eightOut) {
      return 'Шар №8 покинул игровую поверхность.';
    }

    if (shot.foulReasons.length > 0) {
      return (
        'Последний удар завершился фолом:\n' +
        shot.foulReasons.join('; ')
      );
    }

    return 'Партия завершена.';
  }

  public show(data: MatchResultData): void {
    const humanWon = data.winnerId === 1;

    this.title.textContent = humanWon
      ? 'ПОБЕДА!'
      : 'ПОРАЖЕНИЕ';

    this.title.style.color = humanWon
      ? '#e8c77b'
      : '#edaba7';

    this.description.textContent = humanWon
      ? 'Вы выиграли партию!'
      : 'Бот выиграл партию.';

    this.reason.textContent = this.getReason(data);

    this.root.style.display = 'flex';
  }

  public hide(): void {
    this.root.style.display = 'none';
  }

  public dispose(): void {
    this.root.remove();
  }
}

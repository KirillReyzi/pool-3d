
export interface PauseMenuActions {
  onResume: () => void;
  onNewGame: () => void;
  onMainMenu: () => void;
}

export class PauseMenu {
  private readonly root: HTMLDivElement;

  constructor(actions: PauseMenuActions) {
    this.root = document.createElement('div');

    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(5, 12, 9, 0.76)',
      backdropFilter: 'blur(7px)',
      zIndex: '100',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      pointerEvents: 'auto',
    });

    const panel = document.createElement('div');

    Object.assign(panel.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '12px',
      width: 'min(340px, calc(100vw - 40px))',
      padding: '32px',
      boxSizing: 'border-box',
      background: '#172b20',
      border: '1px solid #45674f',
      borderRadius: '16px',
      boxShadow: '0 16px 60px rgba(0,0,0,0.45)',
    });

    const heading = document.createElement('h2');

    heading.textContent = 'ПАУЗА';

    Object.assign(heading.style, {
      margin: '0 0 4px',
      textAlign: 'center',
      fontSize: '28px',
      letterSpacing: '2px',
    });

    const description = document.createElement('p');

    description.textContent = 'Партия приостановлена';

    Object.assign(description.style, {
      margin: '0 0 18px',
      textAlign: 'center',
      fontSize: '13px',
      color: '#bbd0c1',
    });

    const resumeButton = this.createButton(
      'Продолжить',
      true
    );

    resumeButton.addEventListener(
      'click',
      actions.onResume
    );

    const restartButton = this.createButton(
      'Новая партия',
      false
    );

    restartButton.addEventListener(
      'click',
      actions.onNewGame
    );

    const mainMenuButton = this.createButton(
  'В главное меню',
  false
);

mainMenuButton.addEventListener(
  'click',
  actions.onMainMenu
);

    const hint = document.createElement('div');

    hint.textContent = 'Esc — продолжить игру';

    Object.assign(hint.style, {
      marginTop: '8px',
      textAlign: 'center',
      fontSize: '12px',
      color: '#9fb5a6',
    });

    panel.append(
  heading,
  description,
  resumeButton,
  restartButton,
  mainMenuButton,
  hint
);

    this.root.appendChild(panel);
    document.body.appendChild(this.root);
  }

  private createButton(
    title: string,
    primary: boolean
  ): HTMLButtonElement {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = title;

    Object.assign(button.style, {
      padding: '14px 18px',
      borderRadius: '9px',
      border: primary
        ? '1px solid #e3c479'
        : '1px solid #56705d',
      background: primary
        ? '#e3c479'
        : '#30483a',
      color: primary ? '#18231b' : '#ffffff',
      fontSize: '15px',
      fontWeight: 'bold',
      cursor: 'pointer',
    });

    return button;
  }

  public show(): void {
    this.root.style.display = 'flex';
  }

  public hide(): void {
    this.root.style.display = 'none';
  }

  public dispose(): void {
    this.root.remove();
  }
}

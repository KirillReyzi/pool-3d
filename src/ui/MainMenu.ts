
type MenuPage =
  | 'home'
  | 'rules'
  | 'controls'
  | 'roadmap'
  | 'feedback';

export interface MainMenuActions {
  onPlay: () => void;
}

export class MainMenu {
  private readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;

  constructor(privateActions: MainMenuActions) {
    const actions = privateActions;

    this.root = document.createElement('div');

    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      overflowY: 'auto',
      background: 'rgba(7, 20, 13, 0.96)',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      zIndex: '200',
      pointerEvents: 'auto',
    });

    this.panel = document.createElement('div');

    Object.assign(this.panel.style, {
      width: 'min(440px, 100%)',
      boxSizing: 'border-box',
      padding: '30px',
      borderRadius: '18px',
      background: '#193324',
      border: '1px solid #466b50',
      boxShadow: '0 24px 70px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    });

    this.root.appendChild(this.panel);
    document.body.appendChild(this.root);

    this.render('home', actions);
  }

  private makeButton(
    text: string,
    onClick: () => void,
    primary = false
  ): HTMLButtonElement {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = text;

    Object.assign(button.style, {
      width: '100%',
      padding: '13px 16px',
      borderRadius: '9px',
      border: primary
        ? '1px solid #e4c277'
        : '1px solid #50745a',
      background: primary
        ? '#e4c277'
        : '#304e39',
      color: primary ? '#172719' : '#ffffff',
      fontSize: '15px',
      fontWeight: 'bold',
      cursor: 'pointer',
    });

    button.addEventListener('click', onClick);

    return button;
  }

  private makeText(
    content: string,
    size = '14px'
  ): HTMLDivElement {
    const element = document.createElement('div');

    element.textContent = content;

    Object.assign(element.style, {
      fontSize: size,
      lineHeight: '1.65',
      color: '#cadbce',
      whiteSpace: 'pre-line',
    });

    return element;
  }

  private render(
    page: MenuPage,
    actions: MainMenuActions
  ): void {
    this.panel.replaceChildren();

    const heading = document.createElement('h1');

    const titles: Record<MenuPage, string> = {
      home: '8 BALL POOL',
      rules: 'ПРАВИЛА',
      controls: 'УПРАВЛЕНИЕ',
      roadmap: 'ДОРОЖНАЯ КАРТА',
      feedback: 'ОБРАТНАЯ СВЯЗЬ',
    };

    heading.textContent = titles[page];

    Object.assign(heading.style, {
      margin: '0',
      textAlign: 'center',
      fontSize: page === 'home' ? '32px' : '23px',
      letterSpacing: '2px',
      color: '#f6e9c4',
    });

    this.panel.appendChild(heading);

    if (page === 'home') {
      const subtitle = this.makeText(
        'Американский пул-8 против компьютера',
        '13px'
      );

      subtitle.style.textAlign = 'center';
      subtitle.style.marginBottom = '12px';

      this.panel.appendChild(subtitle);

      this.panel.append(
        this.makeButton(
          'Играть',
          actions.onPlay,
          true
        ),
        this.makeButton(
          'Правила',
          () => this.render('rules', actions)
        ),
        this.makeButton(
          'Управление',
          () => this.render('controls', actions)
        ),
        this.makeButton(
          'Дорожная карта',
          () => this.render('roadmap', actions)
        ),
        this.makeButton(
          'Обратная связь',
          () => this.render('feedback', actions)
        )
      );

      const version = this.makeText(
        'Ранняя версия · Только ПК',
        '11px'
      );

      version.style.textAlign = 'center';
      version.style.marginTop = '8px';

      this.panel.appendChild(version);
      return;
    }

    if (page === 'rules') {
      this.panel.appendChild(
        this.makeText(
          'Цель игры — забить все шары своей группы, ' +
          'а затем законно забить чёрный шар №8.\n\n' +
          'Группы:\n' +
          '• Сплошные: №1–7.\n' +
          '• Полосатые: №9–15.\n\n' +
          'После разбоя стол остаётся открытым. ' +
          'Группы назначаются после законного ' +
          'результативного удара.\n\n' +
          'За фол соперник получает право ' +
          'разместить биток.\n\n' +
          'В этой версии не требуется заказывать ' +
          'конкретный шар и лузу.\n\n' +
          'Правила разбоя и отдельные спорные ' +
          'ситуации пока упрощены для MVP.'
        )
      );
    }

    if (page === 'controls') {
      this.panel.appendChild(
        this.makeText(
          'Осмотр стола:\n' +
          '• Мышь — управление камерой.\n' +
          '• A — перейти к прицеливанию.\n\n' +
          'Прицеливание:\n' +
          '• Удерживать ЛКМ и двигать мышь — ' +
          'менять направление удара.\n' +
          '• ↑ / ↓ — изменять силу.\n' +
          '• Space — выполнить удар.\n\n' +
          'Размещение битка:\n' +
          '• Перемещение мыши — выбор позиции.\n' +
          '• ЛКМ — подтвердить позицию.\n\n' +
          'Esc — открыть или закрыть паузу.\n\n' +
          'Игра рассчитана на клавиатуру и мышь.'
        )
      );
    }

    if (page === 'roadmap') {
      this.panel.appendChild(
        this.makeText(
          'Реализовано:\n' +
          '• 3D-стол и физика шаров.\n' +
          '• Основная логика пула-8.\n' +
          '• Компьютерный соперник.\n' +
          '• HUD и управление партией.\n\n' +
          'В планах:\n' +
          '• Полноценный экран результатов.\n' +
          '• Улучшение поведения бота.\n' +
          '• Звуки и полировка интерфейса.\n' +
          '• Дополнительные проверки правил.\n' +
          '• Интеграция SDK Яндекс Игр.\n' +
          '• Публикация и сбор обратной связи.'
        )
      );
    }

    if (page === 'feedback') {
      this.panel.appendChild(
        this.makeText(
          'Здесь появится возможность сообщить ' +
          'об ошибке или предложить улучшение.\n\n' +
          'Форма отправки пока не подключена. ' +
          'Мы добавим её перед публичным запуском.'
        )
      );
    }

    this.panel.appendChild(
      this.makeButton(
        'Назад',
        () => this.render('home', actions)
      )
    );
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


import { describe, expect, it } from 'vitest';
import { GameRules } from './GameRules';

// Симулируем первое столкновение битка с шаром
function contact(rules: GameRules, ball: number): void {
  rules.handlePhysicsEvent({
    type: 'ball-collision',
    ballA: 0,
    ballB: ball,
  });
}

// Симулируем попадание шара в лузу
function pocket(
  rules: GameRules,
  ball: number,
  pocketId = 0
): void {
  rules.handlePhysicsEvent({
    type: 'ball-pocketed',
    ballNumber: ball,
    pocketId,
  });
}

// Симулируем касание борта
function rail(rules: GameRules, ball: number): void {
  rules.handlePhysicsEvent({
    type: 'rail-collision',
    ballNumber: ball,
    railId: 0,
  });
}

// Выполняем законный результативный разбой.
// Шар 9 забит, но группы пока не назначаются.
function successfulBreak(rules: GameRules): void {
  expect(rules.startShot()).toBe(true);
  contact(rules, 1);
  pocket(rules, 9);

  const result = rules.finishShot();

  expect(result?.isFoul).toBe(false);
  expect(rules.getPhase()).toBe('open');
}

describe('GameRules — правила пула-8', () => {

  it('Начальная партия: группы отсутствуют', () => {
    const rules = new GameRules();

    expect(rules.getPhase()).toBe('break');
    expect(rules.getCurrentPlayer()).toBe(1);
    expect(rules.getPlayers()[0].group).toBeNull();
    expect(rules.getPlayers()[1].group).toBeNull();
    expect(rules.getRemainingBalls()).toHaveLength(15);
  });

  it('После результативного разбоя стол остаётся открытым', () => {
    const rules = new GameRules();

    successfulBreak(rules);

    expect(rules.getPlayers()[0].group).toBeNull();
    expect(rules.getPlayers()[1].group).toBeNull();
    expect(rules.getCurrentPlayer()).toBe(1);
  });

  it('Смешанное забитие не назначает группы', () => {
    const rules = new GameRules();
    successfulBreak(rules);

    expect(rules.startShot()).toBe(true);

    contact(rules, 2);
    pocket(rules, 2);
    pocket(rules, 10);

    const result = rules.finishShot();

    expect(result?.isFoul).toBe(false);
    expect(result?.assignedGroup).toBeNull();
    expect(rules.getPhase()).toBe('open');
    expect(rules.getCurrentPlayer()).toBe(1);
  });

  it('Забитие только сплошных назначает группы', () => {
    const rules = new GameRules();
    successfulBreak(rules);

    rules.startShot();
    contact(rules, 3);
    pocket(rules, 3);
    pocket(rules, 6);

    const result = rules.finishShot();

    expect(result?.assignedGroup).toBe('solids');
    expect(rules.getPlayers()[0].group).toBe('solids');
    expect(rules.getPlayers()[1].group).toBe('stripes');
    expect(rules.getPhase()).toBe('assigned');
  });

  it('Законный удар без забития передаёт ход', () => {
    const rules = new GameRules();
    successfulBreak(rules);

    rules.startShot();
    contact(rules, 3);
    rail(rules, 3);

    const result = rules.finishShot();

    expect(result?.isFoul).toBe(false);
    expect(result?.nextPlayerId).toBe(2);
    expect(rules.getCurrentPlayer()).toBe(2);
  });

  it('Первый контакт с восьмёркой на открытом столе — фол', () => {
    const rules = new GameRules();
    successfulBreak(rules);

    rules.startShot();
    contact(rules, 8);
    rail(rules, 8);

    const result = rules.finishShot();

    expect(result?.isFoul).toBe(true);
    expect(result?.ballInHand).toBe(true);
    expect(rules.canStartShot()).toBe(false);

    // Подтверждаем размещение битка
    rules.confirmBallInHand();

    expect(rules.canStartShot()).toBe(true);
  });

  it('Преждевременное забитие восьмёрки — поражение', () => {
    const rules = new GameRules();
    successfulBreak(rules);

    // Назначаем первому игроку сплошные
    rules.startShot();
    contact(rules, 1);
    pocket(rules, 1);
    rules.finishShot();

    // Игрок забивает восьмёрку,
    // не очистив свою группу
    rules.startShot();
    contact(rules, 8);
    pocket(rules, 8);

    const result = rules.finishShot();

    expect(result?.winnerId).toBe(2);
    expect(rules.getPhase()).toBe('finished');
    expect(rules.canStartShot()).toBe(false);
  });

  it('Неудачный разбой разрешает подготовить повторный', () => {
    const rules = new GameRules();

    rules.startShot();
    contact(rules, 1);

    const result = rules.finishShot();

    expect(result?.breakNeedsDecision).toBe(true);
    expect(rules.getPhase()).toBe('break-decision');
    expect(rules.canStartShot()).toBe(false);

    expect(rules.prepareRebreak()).toBe(true);
    expect(rules.getPhase()).toBe('break');
    expect(rules.getCurrentPlayer()).toBe(2);
    expect(rules.canStartShot()).toBe(true);
  });

});


/**
 * Подготавливаем партию с назначенными группами.
 *
 * Игрок 1 — сплошные (1–7).
 * Игрок 2 — полосатые (9–15).
 *
 * На разбое забивается №9.
 * После разбоя игрок 1 забивает №1.
 */
function createAssignedGame(): GameRules {
  const rules = new GameRules();

  // Результативный разбой.
  expect(rules.startShot()).toBe(true);

  rules.handlePhysicsEvent({
    type: 'ball-collision',
    ballA: 0,
    ballB: 1,
  });

  rules.handlePhysicsEvent({
    type: 'ball-pocketed',
    ballNumber: 9,
    pocketId: 0,
  });

  rules.finishShot();

  // Назначаем сплошные первому игроку.
  expect(rules.startShot()).toBe(true);

  rules.handlePhysicsEvent({
    type: 'ball-collision',
    ballA: 0,
    ballB: 1,
  });

  rules.handlePhysicsEvent({
    type: 'ball-pocketed',
    ballNumber: 1,
    pocketId: 0,
  });

  rules.finishShot();

  expect(rules.getPhase()).toBe('assigned');
  expect(rules.getPlayers()[0].group).toBe('solids');
  expect(rules.getPlayers()[1].group).toBe('stripes');

  return rules;
}

describe('GameRules 2.0 — расширенные сценарии', () => {

  it('Контакт с чужой группой вызывает фол', () => {
    const rules = createAssignedGame();

    expect(rules.startShot()).toBe(true);

    // Игрок 1 должен бить по сплошным,
    // но первым касается полосатого №10.
    contact(rules, 10);
    rail(rules, 10);

    const result = rules.finishShot();

    expect(result?.isFoul).toBe(true);
    expect(result?.ballInHand).toBe(true);
    expect(result?.nextPlayerId).toBe(2);
    expect(rules.canStartShot()).toBe(false);
  });

  it('Забитый чужой шар сам по себе не является фолом', () => {
    const rules = createAssignedGame();

    expect(rules.startShot()).toBe(true);

    // Первый контакт законный.
    contact(rules, 2);

    // Но в лузу попадает только чужой шар.
    pocket(rules, 10);

    const result = rules.finishShot();

    expect(result?.isFoul).toBe(false);
    expect(result?.nextPlayerId).toBe(2);
    expect(result?.ballInHand).toBe(false);
  });

  it('Своя и чужая группы за один удар сохраняют ход', () => {
    const rules = createAssignedGame();

    expect(rules.startShot()).toBe(true);

    contact(rules, 2);
    pocket(rules, 2);
    pocket(rules, 10);

    const result = rules.finishShot();

    expect(result?.isFoul).toBe(false);
    expect(result?.nextPlayerId).toBe(1);
    expect(rules.getPhase()).toBe('assigned');
  });

  it('Забитие битка даёт ball in hand сопернику', () => {
    const rules = createAssignedGame();

    expect(rules.startShot()).toBe(true);

    contact(rules, 2);
    rail(rules, 2);

    // Белый шар падает в лузу.
    pocket(rules, 0);

    const result = rules.finishShot();

    expect(result?.cueBallFoul).toBe(true);
    expect(result?.isFoul).toBe(true);
    expect(result?.nextPlayerId).toBe(2);
    expect(result?.ballInHand).toBe(true);

    rules.confirmBallInHand();

    expect(rules.canStartShot()).toBe(true);
  });

  it('Нет борта и забития после контакта — фол', () => {
    const rules = createAssignedGame();

    expect(rules.startShot()).toBe(true);

    // Биток задел свой шар №2,
    // но дальше ничего не произошло.
    contact(rules, 2);

    const result = rules.finishShot();

    expect(result?.isFoul).toBe(true);
    expect(result?.ballInHand).toBe(true);
    expect(result?.nextPlayerId).toBe(2);
  });

  it('Последний свой шар и восьмёрка одним ударом — поражение', () => {
    const rules = createAssignedGame();

    expect(rules.startShot()).toBe(true);

    // На начало удара ещё есть шары группы.
    contact(rules, 2);

    // Забиваем все оставшиеся сплошные.
    for (let number = 2; number <= 7; number++) {
      pocket(rules, number);
    }

    // В том же ударе забивается восьмёрка.
    pocket(rules, 8);

    const result = rules.finishShot();

    expect(result?.eightBallPocketed).toBe(true);
    expect(result?.winnerId).toBe(2);
    expect(rules.getPhase()).toBe('finished');
    expect(rules.canStartShot()).toBe(false);
  });

  it('Законная восьмёрка после очистки группы — победа', () => {
    const rules = createAssignedGame();

    // Очищаем оставшуюся группу первым игроком.
    expect(rules.startShot()).toBe(true);

    contact(rules, 2);

    for (let number = 2; number <= 7; number++) {
      pocket(rules, number);
    }

    const clearingResult = rules.finishShot();

    expect(clearingResult?.isFoul).toBe(false);

    // Следующий удар: теперь восьмёрка разрешена.
    expect(rules.startShot()).toBe(true);

    contact(rules, 8);
    pocket(rules, 8);

    const result = rules.finishShot();

    expect(result?.isFoul).toBe(false);
    expect(result?.winnerId).toBe(1);
    expect(rules.getWinner()).toBe(1);
    expect(rules.getPhase()).toBe('finished');
    expect(rules.canStartShot()).toBe(false);
  });

});


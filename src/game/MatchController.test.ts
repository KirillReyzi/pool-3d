
import { describe, expect, it } from 'vitest';

import { MatchController } from './MatchController';

function contact(
  match: MatchController,
  ballNumber: number
): void {
  match.rules.handlePhysicsEvent({
    type: 'ball-collision',
    ballA: 0,
    ballB: ballNumber,
  });
}

function pocket(
  match: MatchController,
  ballNumber: number
): void {
  match.rules.handlePhysicsEvent({
    type: 'ball-pocketed',
    ballNumber,
    pocketId: 0,
  });
}

function rail(
  match: MatchController,
  ballNumber: number
): void {
  match.rules.handlePhysicsEvent({
    type: 'rail-collision',
    ballNumber,
    railId: 0,
  });
}

describe('MatchController', () => {
  it('Начинает партию с человеком', () => {
    const match = new MatchController();
    const state = match.getSnapshot();

    expect(state.currentPlayerId).toBe(1);
    expect(state.currentPlayerKind).toBe('human');
    expect(state.phase).toBe('break');
    expect(state.winnerId).toBeNull();
  });

  it('Передаёт повторный разбой боту', () => {
    const match = new MatchController();

    expect(match.startShot()).toBe(true);

    // Первый контакт есть, но разбой
    // недостаточно результативен.
    contact(match, 1);

    const outcome = match.completeShot();

    expect(outcome).not.toBeNull();
    expect(outcome?.resetRack).toBe(true);
    expect(outcome?.placementRequired).toBe(true);

    const state = match.getSnapshot();

    expect(state.currentPlayerId).toBe(2);
    expect(state.currentPlayerKind).toBe('bot');
    expect(state.phase).toBe('break');
    expect(match.canStartShot()).toBe(true);
  });

  it('После обычного фола требует размещения битка', () => {
    const match = new MatchController();

    // Законный результативный разбой.
    expect(match.startShot()).toBe(true);

    contact(match, 1);
    pocket(match, 9);

    match.completeShot();

    expect(match.getSnapshot().phase).toBe('open');

    // Первый контакт с восьмёркой
    // на открытом столе — фол.
    expect(match.startShot()).toBe(true);

    contact(match, 8);
    rail(match, 8);

    const outcome = match.completeShot();

    expect(outcome?.shot.isFoul).toBe(true);
    expect(outcome?.placementRequired).toBe(true);

    expect(match.getSnapshot().currentPlayerId).toBe(2);
    expect(match.getSnapshot().ballInHand).toBe(true);

    // Пока биток не размещён, удар запрещён.
    expect(match.canStartShot()).toBe(false);

    // Подтверждение успешного размещения.
    match.confirmCueBallPlacement();

    expect(match.getSnapshot().ballInHand).toBe(false);
    expect(match.canStartShot()).toBe(true);
  });

  it('Продолжает ход после законного забития', () => {
    const match = new MatchController();

    match.startShot();
    contact(match, 1);
    pocket(match, 9);
    match.completeShot();

    match.startShot();
    contact(match, 2);
    pocket(match, 2);

    const outcome = match.completeShot();

    expect(outcome?.shot.isFoul).toBe(false);
    expect(outcome?.shot.assignedGroup).toBe('solids');

    const state = match.getSnapshot();

    expect(state.currentPlayerId).toBe(1);
    expect(state.players[0].group).toBe('solids');
    expect(state.players[1].group).toBe('stripes');
  });
});

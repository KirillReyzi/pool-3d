
import './style.css';
import RAPIER from '@dimforge/rapier3d-compat';

import { Game } from './game/Game';

async function main() {
  // Инициализируем WebAssembly-модуль физики
  await RAPIER.init();

  // Создаём игру только после загрузки Rapier
  const game = new Game();

  // Запускаем игровой цикл
  game.start();
}

main().catch((error) => {
  console.error('Ошибка запуска игры:', error);
});

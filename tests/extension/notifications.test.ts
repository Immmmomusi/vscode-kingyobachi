import { AquariumNotifier } from '../../src/extension/notifications';
import { createAquariumState, createFishState } from '../test-utils/helpers';
import { window } from '../test-utils/mock-vscode';
import { HUNGER_WARNING_THRESHOLD } from '../../src/shared/constants';

describe('AquariumNotifier', () => {
  let notifier: AquariumNotifier;

  beforeEach(() => {
    notifier = new AquariumNotifier();
    vi.clearAllMocks();
  });

  describe('空腹警告', () => {
    it('hunger が閾値以下のとき警告を表示する', () => {
      const fish = createFishState({ hunger: HUNGER_WARNING_THRESHOLD, name: 'TestFish' });
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));

      expect(window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('TestFish'),
        'Feed',
      );
    });

    it('同じ金魚に対して重複警告を出さない', () => {
      const fish = createFishState({ hunger: 10 });
      const state = createAquariumState({ fish: [fish] });

      notifier.checkAndNotify(state);
      notifier.checkAndNotify(state);

      expect(window.showWarningMessage).toHaveBeenCalledTimes(1);
    });

    it('空腹が解消されたあと再度空腹になると再警告する', () => {
      const fish = createFishState({ hunger: 10 });
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));
      expect(window.showWarningMessage).toHaveBeenCalledTimes(1);

      // 餌を食べて回復
      fish.hunger = 80;
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));

      // 再度空腹に
      fish.hunger = 5;
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));
      expect(window.showWarningMessage).toHaveBeenCalledTimes(2);
    });

    it('hunger が閾値より高い場合は警告しない', () => {
      const fish = createFishState({ hunger: HUNGER_WARNING_THRESHOLD + 1 });
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));

      expect(window.showWarningMessage).not.toHaveBeenCalled();
    });
  });

  describe('死亡通知', () => {
    it('金魚が死亡すると通知を表示する', () => {
      const fish = createFishState({ alive: false, name: 'TestFish' });
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));

      expect(window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('TestFish'),
      );
    });

    it('同じ金魚に対して重複通知を出さない', () => {
      const fish = createFishState({ alive: false });
      const state = createAquariumState({ fish: [fish] });

      notifier.checkAndNotify(state);
      notifier.checkAndNotify(state);

      expect(window.showInformationMessage).toHaveBeenCalledTimes(1);
    });

    it('生存する金魚には死亡通知を出さない', () => {
      const fish = createFishState({ alive: true });
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));

      expect(window.showInformationMessage).not.toHaveBeenCalled();
    });
  });

  describe('クリーンアップ', () => {
    it('削除された金魚のトラッキングをクリーンアップする', () => {
      const fish = createFishState({ hunger: 10 });
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));
      expect(window.showWarningMessage).toHaveBeenCalledTimes(1);

      // 金魚を削除
      notifier.checkAndNotify(createAquariumState({ fish: [] }));

      // 同じ ID の金魚を再追加しても新しい警告が出る
      notifier.checkAndNotify(createAquariumState({ fish: [fish] }));
      expect(window.showWarningMessage).toHaveBeenCalledTimes(2);
    });
  });
});

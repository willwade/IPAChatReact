import { playPhoneme } from './playPhoneme';

describe('playPhoneme', () => {
  it('plays audio from cache when available', async () => {
    const play = jest.fn().mockResolvedValue();
    const audioCache = {
      a: { cloneNode: () => ({ play }) }
    };
    const deps = {
      audioCache,
      getPhonemeFileName: jest.fn(),
      loadAudioFile: jest.fn(),
      handlePhonemeSpeak: jest.fn(),
      selectedVoice: 'voice'
    };
    await playPhoneme('a', deps);
    expect(play).toHaveBeenCalled();
    expect(deps.loadAudioFile).not.toHaveBeenCalled();
    expect(deps.handlePhonemeSpeak).not.toHaveBeenCalled();
  });

  it('loads audio when not cached', async () => {
    const play = jest.fn().mockResolvedValue();
    const deps = {
      audioCache: {},
      getPhonemeFileName: jest.fn(() => 'file'),
      loadAudioFile: jest.fn(() => Promise.resolve({ play })),
      handlePhonemeSpeak: jest.fn(),
      selectedVoice: 'voice'
    };
    await playPhoneme('b', deps);
    expect(deps.loadAudioFile).toHaveBeenCalledWith('file');
    expect(play).toHaveBeenCalled();
    expect(deps.audioCache.b).toBeDefined();
  });

  it('skips special marks', async () => {
    const deps = {
      audioCache: {},
      getPhonemeFileName: jest.fn(),
      loadAudioFile: jest.fn(),
      handlePhonemeSpeak: jest.fn(),
      selectedVoice: 'voice'
    };
    const marks = ['↑', 'ˈ', 'ˌ'];
    for (const mark of marks) {
      await playPhoneme(mark, deps);
    }
    expect(deps.loadAudioFile).not.toHaveBeenCalled();
    expect(deps.handlePhonemeSpeak).not.toHaveBeenCalled();
  });
});

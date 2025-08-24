export const playPhoneme = (phoneme, {
  audioCache,
  getPhonemeFileName,
  loadAudioFile,
  handlePhonemeSpeak,
  selectedVoice
}) => {
  if (/[↗↘↑↓|‖]/.test(phoneme)) {
    return Promise.resolve();
  }

  if (audioCache[phoneme]) {
    const audioClone = audioCache[phoneme].cloneNode();
    return audioClone.play().catch(() => {
      handlePhonemeSpeak(phoneme);
    });
  }

  const fileName = getPhonemeFileName(phoneme, selectedVoice);
  return loadAudioFile(fileName)
    .then(audio => {
      audioCache[phoneme] = audio;
      return audio.play();
    })
    .catch(() => {
      handlePhonemeSpeak(phoneme);
    });
};

export default playPhoneme;

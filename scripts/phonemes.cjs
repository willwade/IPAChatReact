const phoneticData = {
  'en-GB': {
    name: 'British English',
    groups: {
      vowels: {
        title: 'Vowels',
        color: '#2196f3',
        phonemes: ['iː', 'ɪ', 'e', 'æ', 'ɑː', 'ɒ', 'ɐ', 'ɔː', 'ʊ', 'uː', 'ɜː', 'ə', 'ʌ', 'i']
      },
      diphthongs: {
        title: 'Diphthongs',
        color: '#4caf50',
        phonemes: ['eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'ɪə', 'eə', 'ʊə']
      },
      consonants: {
        title: 'Consonants',
        color: '#ff9800',
        phonemes: ['p', 'b', 't', 'd', 'k', 'g', 'tʃ', 'dʒ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'r', 'j', 'w']
      },
      stress: {
        title: 'Stress & Intonation',
        color: '#9c27b0',
        phonemes: ['ˈ', 'ˌ', '↗', '↘', '↑', '↓', '|', '‖']
      }
    }
  },
  'en-US': {
    name: 'American English',
    groups: {
      vowels: {
        title: 'Vowels',
        color: '#2196f3',
        phonemes: ['i', 'ɪ', 'e', 'ɛ', 'æ', 'ɑ', 'ɔ', 'o', 'ʊ', 'u', 'ʌ', 'ə', 'ɚ', 'ɝ']
      },
      diphthongs: {
        title: 'Diphthongs',
        color: '#4caf50',
        phonemes: ['eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'aʊ']
      },
      consonants: {
        title: 'Consonants',
        color: '#ff9800',
        phonemes: ['p', 'b', 't', 'd', 'k', 'g', 'tʃ', 'dʒ', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ', 'l', 'ɹ', 'j', 'w']
      },
      stress: {
        title: 'Stress & Intonation',
        color: '#9c27b0',
        phonemes: ['ˈ', 'ˌ', '↗', '↘', '↑', '↓', '|', '‖']
      }
    }
  }
};

module.exports = { phoneticData };

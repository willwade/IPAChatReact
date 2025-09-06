// Tonal markers for tonal languages
export const tonalMarkers = ['˩', '˧', '˥'];

export const stressors = {
  title: 'Stress & Intonation',
  color: '#9c27b0',
  phonemes: ['ˈ', 'ˌ', '↗', '↘', '↑', '↓', '|', '‖']
};

export const detailedPhoneticData = {
  'en-GB': {
    name: 'British English',
    groups: {
      consonants: {
        title: 'Consonants',
        color: '#ff9800',
        phonemes: ['k', 'f', 't', 'ʃ', 'r', 'n', 's', 'p', 'l']
      },
      vowels: {
        title: 'Vowels',
        color: '#2196f3',
        phonemes: ['ɒ', 'iː', 'æ', 'ɪ', 'ɛ', 'aː']
      }
    }
  },
  'en-US': {
    name: 'American English',
    groups: {
      consonants: {
        title: 'Consonants',
        color: '#ff9800',
        phonemes: ['k', 'f', 't', 'ʃ', 'r', 'n', 's', 'p', 'l']
      },
      vowels: {
        title: 'Vowels',
        color: '#2196f3',
        phonemes: ['ɒ', 'iː', 'æ', 'ɪ', 'ɛ', 'aː']
      }
    }
  },
  'fr-FR': {
    name: 'French',
    groups: {
      vowels: {
        title: 'Vowels',
        color: '#2196f3',
        phonemes: ['i', 'e', 'ɛ', 'a', 'ɑ', 'o', 'ɔ', 'u', 'y', 'ø', 'œ']
      },
      nasals: {
        title: 'Nasal Vowels',
        color: '#4caf50',
        phonemes: ['ɑ̃', 'ɛ̃', 'œ̃', 'ɔ̃']
      },
      semivowels: {
        title: 'Semivowels',
        color: '#ff9800',
        phonemes: ['w', 'ɥ', 'j']
      },
      consonants: {
        title: 'Consonants',
        color: '#f44336',
        phonemes: ['p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 's', 'z', 'ʃ', 'ʒ', 'm', 'n', 'ɲ', 'ŋ', 'l', 'ʁ']
      },
      stress: stressors
    }
  },
  'es-ES': {
    name: 'Spanish',
    groups: {
      vowels: {
        title: 'Vowels',
        color: '#2196f3',
        phonemes: ['i', 'e', 'a', 'o', 'u']
      },
      semivowels: {
        title: 'Semivowels',
        color: '#4caf50',
        phonemes: ['j', 'w']
      },
      consonants: {
        title: 'Consonants',
        color: '#ff9800',
        phonemes: ['p', 'b', 't', 'd', 'k', 'g', 'ʧ', 'ʤ', 'f', 'θ', 's', 'ʃ', 'x', 'm', 'n', 'ɲ', 'ŋ', 'l', 'ʎ', 'r', 'ɾ', 'ʁ']
      },
      stress: stressors
    }
  },
  'ru-RU': {
    name: 'Russian',
    groups: {
      vowels: {
        title: 'Vowels',
        color: '#2196f3',
        phonemes: ['i', 'e', 'a', 'o', 'u', 'ɨ', 'ʲi', 'ʲe', 'ʲa', 'ʲo', 'ʲu']
      },
      consonants: {
        title: 'Consonants',
        color: '#ff9800',
        phonemes: ['p', 'pʲ', 'b', 'bʲ', 't', 'tʲ', 'd', 'dʲ', 'k', 'kʲ', 'g', 'gʲ', 'f', 'fʲ', 'v', 'vʲ', 's', 'sʲ', 'z', 'zʲ', 'ʂ', 'ʐ', 'x', 'xʲ', 'ts', 'tɕ', 'm', 'mʲ', 'n', 'nʲ', 'l', 'lʲ', 'r', 'rʲ', 'j']
      },
      stress: stressors
    }
  }
};

export const voicesByLanguage = {
  'en-GB': [
    { name: 'en-GB-SoniaNeural', displayName: 'Sonia (Female)' },
    { name: 'en-GB-RyanNeural', displayName: 'Ryan (Male)' },
    { name: 'en-GB-LibbyNeural', displayName: 'Libby (Female)' },
  ],
  'en-US': [
    { name: 'en-US-JennyNeural', displayName: 'Jenny (Female)' },
    { name: 'en-US-GuyNeural', displayName: 'Guy (Male)' },
    { name: 'en-US-AriaNeural', displayName: 'Aria (Female)' },
  ],
  'fr-FR': [
    { name: 'fr-FR-DeniseNeural', displayName: 'Denise (Female)' },
    { name: 'fr-FR-HenriNeural', displayName: 'Henri (Male)' }
  ],
  'es-ES': [
    { name: 'es-ES-ElviraNeural', displayName: 'Elvira (Female)' },
    { name: 'es-ES-AlvaroNeural', displayName: 'Alvaro (Male)' }
  ],
  'ru-RU': [
    { name: 'ru-RU-SvetlanaNeural', displayName: 'Svetlana (Female)' },
    { name: 'ru-RU-DmitryNeural', displayName: 'Dmitry (Male)' }
  ]
};

// Variants Map
export const variantsMap = {
  // Minimal vowel differences
  'eə': ['ɛə'],       // Variants in diphthong transcription (e.g., "hair")
  'æ': ['a'],         // Variants in short "a" (e.g., "pan")
  'ɜː': ['ɜ'],        // Long vs. short schwa
  'oʊ': ['əʊ'],       // British vs. American diphthong (not in table but relevant)
  
  // Schwa-related differences
  'ə': ['ɐ'],         // Schwa variations (neutral vowels)
  'ʌ': ['ɑ'],         // Broad transcription of "uh" sound (not frequent but exists)
  
  // Consonants (limited variation)
  'ɹ': ['r'],         // Approximant vs. trill for "r"
  's': ['ʃ'],         // Simple vs. palatal transcriptions
  
  // Diphthong simplifications
  'eɪ': ['ɛɪ'],       // Slight variations in diphthong starting point
  'aɪ': ['ʌɪ'],       // "ai" in certain dictionaries

  // Stress and Intonation
  'ˈ': ["'"],         // Primary stress
  'ˌ': [","],         // Secondary stress
};

// Normalize Function
export function normalizePhoneme(phoneme) {
  for (const [primary, variants] of Object.entries(variantsMap)) {
    if (phoneme === primary || variants.includes(phoneme)) {
      return primary; // Normalize to the primary symbol
    }
  }
  return phoneme; // Return unchanged if no mapping found
}

// Function to transform detailed phoneme groups into simpler ones for frontend
export function simplifyPhoneticData(data) {
  const simplified = {};
  
  for (const [lang, langData] of Object.entries(data)) {
    simplified[lang] = {
      name: langData.name,
      groups: {}
    };

    // For English, use the simplified structure
    if (lang === 'en-GB' || lang === 'en-US') {
      simplified[lang].groups.consonants = langData.groups.consonants;
      simplified[lang].groups.vowels = langData.groups.vowels;
    } else {
      // For other languages, keep the original grouping
      simplified[lang].groups = langData.groups;
      // Include stress markers for other languages
      simplified[lang].groups.stress = langData.groups.stress;
    }
  }

  return simplified;
} 
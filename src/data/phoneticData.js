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
      monophthongs: {
        title: 'Monophthongs',
        color: '#2196f3',
        phonemes: ['iː', 'ɪ', 'e', 'æ', 'ɑː', 'ɒ', 'ɐ', 'ɔː', 'ʊ', 'uː', 'ɜː', 'ə', 'ʌ', 'i']
      },
      diphthongs: {
        title: 'Diphthongs',
        color: '#4caf50',
        phonemes: ['eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ', 'ɪə', 'eə', 'ʊə']
      },
      fricatives: {
        title: 'Fricatives',
        color: '#ff9800',
        phonemes: ['ʃ', 'ʒ', 'θ', 'ð', 's', 'z', 'f', 'v', 'h']
      },
      plosives: {
        title: 'Plosives',
        color: '#e91e63',
        phonemes: ['p', 'b', 't', 'd', 'k', 'g']
      },
      affricates: {
        title: 'Affricates',
        color: '#9c27b0',
        phonemes: ['tʃ', 'dʒ']
      },
      approximants: {
        title: 'Approximants',
        color: '#673ab7',
        phonemes: ['ɹ', 'j', 'w']
      },
      laterals: {
        title: 'Lateral Approximants',
        color: '#3f51b5',
        phonemes: ['l']
      },
      nasals: {
        title: 'Nasals',
        color: '#795548',
        phonemes: ['m', 'n', 'ŋ']
      },
      stress: {
        title: 'Stress & Intonation',
        color: '#607d8b',
        phonemes: ['ˈ', 'ˌ', '↗', '↘', '↑', '↓', '|', '‖']
      }
    }
  },
  'en-US': {
    name: 'American English',
    groups: {
      monophthongs: {
        title: 'Monophthongs',
        color: '#2196f3',
        phonemes: ['i', 'ɪ', 'e', 'ɛ', 'æ', 'ɑ', 'ɔ', 'o', 'ʊ', 'u', 'ʌ', 'ə', 'ɚ', 'ɝ']
      },
      diphthongs: {
        title: 'Diphthongs',
        color: '#4caf50',
        phonemes: ['eɪ', 'aɪ', 'ɔɪ', 'oʊ', 'aʊ']
      },
      fricatives: {
        title: 'Fricatives',
        color: '#ff9800',
        phonemes: ['ʃ', 'ʒ', 'θ', 'ð', 's', 'z', 'f', 'v', 'h']
      },
      plosives: {
        title: 'Plosives',
        color: '#9c27b0',
        phonemes: ['p', 'b', 't', 'd', 'k', 'g']
      },
      affricates: {
        title: 'Affricates',
        color: '#9c27b0',
        phonemes: ['tʃ', 'dʒ']
      },
      approximants: {
        title: 'Approximants',
        color: '#9c27b0',
        phonemes: ['ɹ', 'j', 'w']
      },
      laterals: {
        title: 'Lateral Approximants',
        color: '#9c27b0',
        phonemes: ['l']
      },
      nasals: {
        title: 'Nasals',
        color: '#9c27b0',
        phonemes: ['m', 'n', 'ŋ']
      },
      stress: stressors
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
  'ʃ': ['s'],         // Palatal vs. simpler transcriptions
  
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

    // For English, combine monophthongs into vowels
    if (lang === 'en-GB' || lang === 'en-US') {
      simplified[lang].groups.vowels = {
        title: 'Vowels',
        color: '#2196f3',
        phonemes: [...langData.groups.monophthongs.phonemes]
      };
      
      // Add other groups
      simplified[lang].groups.diphthongs = langData.groups.diphthongs;
      
      // Combine all consonant types into one group
      const consonants = [
        ...langData.groups.plosives.phonemes,
        ...langData.groups.fricatives.phonemes,
        ...langData.groups.affricates.phonemes,
        ...langData.groups.approximants.phonemes,
        ...langData.groups.laterals.phonemes,
        ...langData.groups.nasals.phonemes
      ];
      
      simplified[lang].groups.consonants = {
        title: 'Consonants',
        color: '#ff9800',
        phonemes: consonants
      };
    } else {
      // For other languages, keep the original grouping
      simplified[lang].groups = langData.groups;
    }

    // Always include stress markers
    simplified[lang].groups.stress = langData.groups.stress;
  }

  return simplified;
} 
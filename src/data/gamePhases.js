// Define regions with their specific characteristics
export const regions = {
  'en-GB-london': {
    name: 'London English',
    description: 'London/South-East England pronunciation'
  },
  'en-GB-manchester': {
    name: 'Manchester English',
    description: 'Greater Manchester/Northern England pronunciation'
  },
  'en-US-general': {
    name: 'General American',
    description: 'Standard American pronunciation'
  }
};

// Define game phases with regional variations
export const gamePhases = {
  phase1: {
    name: "Single-Syllable Words (Simple Phonemes)",
    words: {
      "mum": {
        'en-GB-london': {
          word: 'mum',
          ipa: 'mɐm',
          alternatives: ['mʌm'],
          validPhonemes: ['m', 'ʌ', 'ɐ', 'ə']
        },
        'en-GB-manchester': {
          word: 'mam',
          ipa: 'mam',
          alternatives: ['mæm'],
          validPhonemes: ['m', 'a', 'æ']
        },
        'en-US-general': {
          word: 'mom',
          ipa: 'mɑm',
          alternatives: ['mɑːm'],
          validPhonemes: ['m', 'ɑ', 'ː']
        }
      },
      "dad": {
        'en-GB-london': {
          word: 'dad',
          ipa: 'dæd',
          alternatives: ['dɐd'],
          validPhonemes: ['d', 'æ', 'ɐ']
        },
        'en-GB-manchester': {
          word: 'dad',
          ipa: 'dad',
          alternatives: ['dæd'],
          validPhonemes: ['d', 'a', 'æ']
        },
        'en-US-general': {
          word: 'dad',
          ipa: 'dæd',
          alternatives: ['dɑːd'],
          validPhonemes: ['d', 'æ', 'ɑ', 'ː']
        }
      },
      "cat": {
        'en-GB-london': {
          word: 'cat',
          ipa: 'kæt',
          alternatives: ['kɐt'],
          validPhonemes: ['k', 'æ', 'ɐ','t']
        },
        'en-GB-manchester': {
          word: 'cat',
          ipa: 'kat',
          alternatives: ['kæt'],
          validPhonemes: ['k', 'a', 'æ','t']
        },
        'en-US-general': {
          word: 'cat',
          ipa: 'kæt',
          alternatives: ['kɛt'],
          validPhonemes: ['k', 'æ', 'ɛ','t']
        }
      }
    }
  },
  phase2: {
    name: "Single-Syllable Words (Complex Phonemes)",
    words: {
      "bath": {
        'en-GB-london': {
          word: 'bath',
          ipa: 'bɑːθ',
          alternatives: ['bæθ'],
          validPhonemes: ['b', 'æ',  'θ']
        },
        'en-GB-manchester': {
          word: 'bath',
          ipa: 'bæθ',
          alternatives: ['bæθ'],
          validPhonemes: ['b', 'a', 'æ', 'θ']
        },
        'en-US-general': {
          word: 'bath',
          ipa: 'bæθ',
          alternatives: ['bɛθ'],
          validPhonemes: ['b', 'æ', 'ɛ', 'θ']
        }
      },
      "grass": {
        'en-GB-london': {
          word: 'grass',
          ipa: 'ɡɹɑːs',
          alternatives: ['ɡɹɑs'],
          validPhonemes: ['ɡ', 'ɹ', 'ɑ', 'ː', 's']
        },
        'en-GB-manchester': {
          word: 'grass',
          ipa: 'ɡɹas',
          alternatives: ['ɡɹæs'],
          validPhonemes: ['ɡ', 'ɹ', 'a', 'æ', 's']
        },
        'en-US-general': {
          word: 'grass',
          ipa: 'ɡɹæs',
          alternatives: ['ɡɹɛs'],
          validPhonemes: ['ɡ', 'ɹ', 'æ', 'ɛ', 's']
        }
      }
    }
  },
  phase3: {
    name: "Two-Syllable Words",
    words: {
      "water": {
        'en-GB-london': {
          word: 'water',
          ipa: 'wɔːtə',
          alternatives: ['wɔːtəʳ'],
          validPhonemes: ['w', 'ɔ', 'ː', 't', 'ə', 'ʳ']
        },
        'en-GB-manchester': {
          word: 'water',
          ipa: 'wɒtə',
          alternatives: ['wɒtəʳ'],
          validPhonemes: ['w', 'ɒ', 't', 'ə', 'ʳ']
        },
        'en-US-general': {
          word: 'water',
          ipa: 'wɑːtər',
          alternatives: ['wɑːɾər'],
          validPhonemes: ['w', 'ɑ', 'ː', 't', 'ə', 'r', 'ɾ']
        }
      },
      "butter": {
        'en-GB-london': {
          word: 'butter',
          ipa: 'bʌtə',
          alternatives: ['bʌtəʳ'],
          validPhonemes: ['b', 'ʌ', 't', 'ə', 'ʳ']
        },
        'en-GB-manchester': {
          word: 'butter',
          ipa: 'bʊtə',
          alternatives: ['bʊtəʳ'],
          validPhonemes: ['b', 'ʊ', 't', 'ə', 'ʳ']
        },
        'en-US-general': {
          word: 'butter',
          ipa: 'bʌtər',
          alternatives: ['bʌɾər'],
          validPhonemes: ['b', 'ʌ', 't', 'ə', 'r', 'ɾ']
        }
      }
    }
  }
};

// Helper function to get the correct word variation for a region
export const getWordVariation = (word, phase, region) => {
  const phaseData = gamePhases[phase];
  if (!phaseData || !phaseData.words[word]) {
    return null;
  }

  const wordData = phaseData.words[word];
  // If the exact region isn't found, fall back to London English
  return wordData[region] || wordData['en-GB-london'];
};

// Helper function to check if an IPA input is correct for a given word
export const isCorrectIPA = (word, phase, inputIPA, region) => {
  const variation = getWordVariation(word, phase, region);
  if (!variation) {
    return false;
  }

  // Check against both the main IPA and alternatives
  return variation.ipa === inputIPA || variation.alternatives.includes(inputIPA);
};

// Helper function to get all accepted IPA forms for a word
export const getAllAcceptedForms = (word, phase, region) => {
  const variation = getWordVariation(word, phase, region);
  if (!variation) {
    return [];
  }

  return [variation.ipa, ...variation.alternatives];
};

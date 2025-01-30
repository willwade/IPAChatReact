import { detailedPhoneticData, voicesByLanguage, stressors, variantsMap, normalizePhoneme } from './phoneticData';

const tonalMarkers = ['˩', '˧', '˥']; // Low, mid, high tone markers for tonal languages

// Function to transform detailed phoneme groups into simpler ones for frontend
function simplifyPhoneticData(data) {
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

export { 
  detailedPhoneticData as phoneticData,
  voicesByLanguage,
  stressors,
  variantsMap,
  normalizePhoneme,
  simplifyPhoneticData,
  tonalMarkers
};
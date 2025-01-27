// Mapping of IPA phonemes to URL-friendly filenames
export const phonemeToFilename = {
  // Single phonemes
  'æ': 'ae',    // as in "cat"
  'ŋ': 'ng',    // as in "sing"
  'θ': 'th',    // as in "thin"
  'ð': 'dh',    // as in "this"
  'ʃ': 'sh',    // as in "ship"
  'ʒ': 'zh',    // as in "measure"
  'ɪ': 'ih',    // as in "kit"
  'ɒ': 'oh',    // as in "lot"
  'ɐ': 'ah',    // as in "up" (Australian)
  'ʊ': 'uh',    // as in "foot"
  'ə': 'schwa', // as in "about"
  'ʌ': 'vu',    // as in "strut"
  'ʧ': 'tsh',   // as in "church" (variant 1)
  'tʃ': 'tsh',  // as in "church" (variant 2)
  'ʤ': 'dzh',   // as in "judge" (variant 1)
  'dʒ': 'dzh',  // as in "judge" (variant 2)
  'ɔ': 'aw',    // as in "thought"
  'ɑ': 'aa',    // as in "father"
  'ɛ': 'eh',    // as in "dress"
  'ɝ': 'ep',    // as in "nurse" (rhotic)
  'ɚ': 'er',    // as in "letter" (rhotic)
  'ɹ': 'turned-r', // as in "red"
  'ɜ': 'ow',    // as in "nurse" (non-rhotic)
  'g': 'g',     // as in "go" (ASCII variant)
  'ɡ': 'g',     // as in "go" (Unicode variant)

  // Combinations and long vowels
  'ɔɪ': 'awih',     // as in "choice"
  'ɔː': 'awlng',    // as in "thought" (long)
  'ɑː': 'aalng',    // as in "father" (long)
  'ɜː': 'owlng',    // as in "nurse" (long)
  'uː': 'ulng',     // as in "goose"
  'iː': 'ilng',     // as in "fleece"
  'ʊə': 'uhschwa',  // as in "cure"
  'əʊ': 'schwauh',  // as in "goat"
  'ɪə': 'ihschwa',  // as in "near"
  'eə': 'eschwa',   // as in "square"
}; 
/**
 * Phoneme Tokenization and Processing Utilities
 *
 * Provides unified phoneme handling for both single-character and
 * multi-character (slash-delimited) phonemes throughout the application.
 */

/**
 * Tokenizes text into complete phonemes, handling both single characters
 * and multi-character phonemes delimited by forward slashes.
 *
 * @param {string} text - Input text containing phonemes
 * @returns {Object} Object containing completed phonemes, partial input, and tokenization state
 */
export function tokenizePhonemes(text) {
  const result = {
    completedPhonemes: [],
    completedText: '',
    partialInput: '',
    isInProgress: false,
    hasValidInput: false
  };

  if (!text) {
    return result;
  }

  let i = 0;
  let currentPhoneme = '';
  let inDelimited = false;

  while (i < text.length) {
    const char = text[i];

    if (char === '/') {
      if (inDelimited) {
        // Closing slash - complete the delimited phoneme
        if (currentPhoneme) {
          result.completedPhonemes.push(currentPhoneme);
          result.completedText += currentPhoneme;
          currentPhoneme = '';
        }
        inDelimited = false;
      } else {
        // Opening slash - start delimited phoneme
        inDelimited = true;
        currentPhoneme = '';
      }
    } else {
      if (inDelimited) {
        // Inside delimited phoneme
        currentPhoneme += char;
      } else {
        // Outside delimiters - treat as single-character phoneme
        result.completedPhonemes.push(char);
        result.completedText += char;
      }
    }

    i++;
  }

  // Handle incomplete delimited phoneme
  if (inDelimited) {
    result.partialInput = '/' + currentPhoneme;
    result.isInProgress = true;
  }

  result.hasValidInput = result.completedPhonemes.length > 0 || result.isInProgress;

  return result;
}

/**
 * Detects newly completed phonemes by comparing current and previous tokenization results.
 *
 * @param {string} currentText - Current input text
 * @param {string} previousText - Previous input text
 * @returns {Array<string>} Array of newly completed phonemes
 */
export function getNewlyCompletedPhonemes(currentText, previousText) {
  const current = tokenizePhonemes(currentText);
  const previous = tokenizePhonemes(previousText);

  // Find new phonemes by comparing completed phonemes arrays
  if (current.completedPhonemes.length > previous.completedPhonemes.length) {
    const newCount = current.completedPhonemes.length - previous.completedPhonemes.length;
    return current.completedPhonemes.slice(-newCount);
  }

  return [];
}

/**
 * Gets the last completed phoneme from tokenized input.
 *
 * @param {string} text - Input text
 * @returns {string|null} Last completed phoneme or null if none
 */
export function getLastCompletedPhoneme(text) {
  const tokens = tokenizePhonemes(text);
  return tokens.completedPhonemes.length > 0
    ? tokens.completedPhonemes[tokens.completedPhonemes.length - 1]
    : null;
}

/**
 * Checks if input contains only completed phonemes (no partial input).
 *
 * @param {string} text - Input text
 * @returns {boolean} True if all phonemes are completed
 */
export function isInputComplete(text) {
  const tokens = tokenizePhonemes(text);
  return !tokens.isInProgress;
}

/**
 * Gets display text with completed phonemes in black and partial input in orange.
 *
 * @param {string} text - Input text
 * @returns {Object} Object with completedText and partialText for display
 */
export function getDisplayText(text) {
  const tokens = tokenizePhonemes(text);
  return {
    completedText: tokens.completedText,
    partialText: tokens.partialInput
  };
}

/**
 * Validates phoneme input for processing - ensures no partial phonemes are processed.
 *
 * @param {string} text - Input text
 * @returns {boolean} True if safe to process (no partial phonemes)
 */
export function isValidForProcessing(text) {
  const tokens = tokenizePhonemes(text);
  return tokens.hasValidInput && !tokens.isInProgress;
}

/**
 * Processes a phoneme input change and returns information about what should be spoken/processed.
 *
 * @param {string} newText - New input text
 * @param {string} previousText - Previous input text
 * @returns {Object} Processing instructions including new phonemes and actions
 */
export function processPhonemeInputChange(newText, previousText) {
  const newTokens = tokenizePhonemes(newText);
  const prevTokens = tokenizePhonemes(previousText);

  const newlyCompleted = getNewlyCompletedPhonemes(newText, previousText);

  return {
    displayText: {
      completed: newTokens.completedText,
      partial: newTokens.partialInput
    },
    newlyCompletedPhonemes: newlyCompleted,
    shouldProcess: newlyCompleted.length > 0,
    isInProgress: newTokens.isInProgress,
    isValidForSpeech: isValidForProcessing(newText),
    totalPhonemes: newTokens.completedPhonemes,
    hasContent: newTokens.hasValidInput
  };
}

/**
 * Removes the last phoneme from the input text, handling both single-character
 * and multi-character phonemes correctly while preserving original text structure.
 *
 * @param {string} text - Current input text
 * @returns {Object} Result containing new text and removed phoneme
 */
export function removeLastPhoneme(text) {
  console.log('🔧 removeLastPhoneme called with:', `"${text}"`);

  if (!text) {
    console.log('🔧 Empty text, returning empty result');
    return {
      newText: '',
      removedPhoneme: '',
      wasPartial: false
    };
  }

  const tokens = tokenizePhonemes(text);
  console.log('🔧 Tokenized:', tokens);

  // If we have partial input, remove that first
  if (tokens.isInProgress) {
    console.log('🔧 Has partial input, removing it');
    // Find the last slash and remove everything from there
    const lastSlashIndex = text.lastIndexOf('/');
    const newText = text.substring(0, lastSlashIndex);
    const result = {
      newText,
      removedPhoneme: tokens.partialInput,
      wasPartial: true
    };
    console.log('🔧 Returning partial result:', result);
    return result;
  }

  // If no completed phonemes, nothing to remove
  if (tokens.completedPhonemes.length === 0) {
    return {
      newText: text,
      removedPhoneme: '',
      wasPartial: false
    };
  }

  // Need to rebuild text by working backwards through the original text
  // to preserve slash structure
  const lastPhoneme = tokens.completedPhonemes[tokens.completedPhonemes.length - 1];

  // Find where the last phoneme starts in the original text
  let newText = '';
  let phonemeIndex = 0;
  let i = 0;

  while (i < text.length && phonemeIndex < tokens.completedPhonemes.length - 1) {
    const char = text[i];

    if (char === '/') {
      const startSlash = i;
      i++; // Skip opening slash
      let phonemeText = '';

      // Find the closing slash
      while (i < text.length && text[i] !== '/') {
        phonemeText += text[i];
        i++;
      }

      if (i < text.length && text[i] === '/') {
        i++; // Skip closing slash
        // Check if this matches our expected phoneme
        if (phonemeText === tokens.completedPhonemes[phonemeIndex]) {
          newText += text.substring(startSlash, i);
          phonemeIndex++;
        }
      }
    } else {
      // Single character phoneme
      if (char === tokens.completedPhonemes[phonemeIndex]) {
        newText += char;
        phonemeIndex++;
        i++;
      } else {
        i++;
      }
    }
  }

  const result = {
    newText,
    removedPhoneme: lastPhoneme,
    wasPartial: false
  };
  console.log('🔧 Returning result:', result);
  return result;
}

/**
 * Reconstructs display text from a list of phonemes, handling proper formatting.
 *
 * @param {Array<string>} phonemes - Array of phoneme strings
 * @param {string} partialInput - Optional partial input to append
 * @returns {string} Reconstructed text for display
 */
export function reconstructTextFromPhonemes(phonemes, partialInput = '') {
  return phonemes.join('') + partialInput;
}
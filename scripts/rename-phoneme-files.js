const fs = require('fs');
const path = require('path');

// Mapping of URL-encoded phonemes to URL-friendly names
const phonemeMap = {
  // Single phonemes
  '%C3%A6': 'ae',    // æ
  '%C5%8B': 'ng',    // ŋ
  '%CE%B8': 'th',    // θ
  '%C3%B0': 'dh',    // ð
  '%CA%83': 'sh',    // ʃ
  '%CA%92': 'zh',    // ʒ
  '%C9%AA': 'ih',    // ɪ
  '%C9%92': 'oh',    // ɒ
  '%C9%90': 'ah',    // ɐ
  '%CA%8A': 'uh',    // ʊ
  '%C9%99': 'schwa', // ə
  '%CA%8C': 'vu',    // ʌ
  '%CA%A7': 'tsh',   // ʧ
  '%CA%A4': 'dzh',   // ʤ
  '%C9%94': 'aw',    // ɔ
  '%C9%91': 'aa',    // ɑ
  '%C9%9B': 'eh',    // ɛ
  '%C9%9D': 'ep',    // ɝ
  '%C9%9A': 'er',    // ɚ
  '%C9%B9': 'turned-r', // ɹ
  '%CB%90': 'lng',   // ː (length mark)
  '%C9%9C': 'ow',    // ɜ

  // Combinations
  '%C9%94ih': 'awih',     // ɔɪ
  '%C9%94%CB%90': 'awlng', // ɔː
  '%C9%91%CB%90': 'aalng', // ɑː
  '%C9%9C%CB%90': 'owlng', // ɜː
  'u%CB%90': 'ulng',      // uː
  'i%CB%90': 'ilng',      // iː
  '%CA%8Aschwa': 'uhschwa', // ʊə
  'schwa%CA%8A': 'schwauh', // əʊ
  '%C9%AAschwa': 'ihschwa', // ɪə
  'eschwa': 'eschwa',     // eə
};

const audioDir = path.join(__dirname, '../public/audio/phonemes');

// Read the directory
fs.readdir(audioDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach(file => {
    // For each file, check if it contains any of our encoded phonemes
    let newName = file;
    Object.entries(phonemeMap).forEach(([encoded, friendly]) => {
      if (file.includes(encoded)) {
        newName = file.replace(encoded, friendly);
      }
    });

    // If the name changed, rename the file
    if (newName !== file) {
      fs.rename(
        path.join(audioDir, file),
        path.join(audioDir, newName),
        err => {
          if (err) {
            console.error(`Error renaming ${file}:`, err);
          } else {
            console.log(`Renamed ${file} to ${newName}`);
          }
        }
      );
    }
  });
}); 
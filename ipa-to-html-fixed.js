#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common phoneme to image/label mappings
const phonemeToVisual = {
  // Vowels - using images from your public/images directory
  'əʊ': { type: 'image', src: 'bow.png' },
  'ɔɪ': { type: 'image', src: 'boy.png' },
  'ɑː': { type: 'image', src: 'car.png' },
  'eə': { type: 'image', src: 'pear.png' },
  'ɪə': { type: 'image', src: 'deer.png' },
  'aɪ': { type: 'image', src: 'eye.png' },
  'eɪ': { type: 'image', src: 'eight.png' },
  'ɔː': { type: 'image', src: 'four.png' },
  'ʊə': { type: 'image', src: 'manure.png' },
  'aʊ': { type: 'image', src: 'out.png' },
  'iː': { type: 'image', src: 'sea.png' },
  'uː': { type: 'image', src: 'two.png' },

  // Consonants - using images where available
  'ʃ': { type: 'image', src: 'shhh.png' },
  'ʒ': { type: 'image', src: 'measure.png' },
  'θ': { type: 'image', src: 'thumb2.png' },
  'ð': { type: 'image', src: 'this.png' },
  'ŋ': { type: 'image', src: 'sing.png' },
  'tʃ': { type: 'image', src: 'chair.png' },

  // Fall back to letters for consonants without specific images
  'p': { type: 'letter', label: 'p' },
  'b': { type: 'letter', label: 'b' },
  't': { type: 'letter', label: 't' },
  'd': { type: 'letter', label: 'd' },
  'k': { type: 'letter', label: 'k' },
  'g': { type: 'letter', label: 'g' },
  'f': { type: 'letter', label: 'f' },
  'v': { type: 'letter', label: 'v' },
  's': { type: 'letter', label: 's' },
  'z': { type: 'letter', label: 'z' },
  'h': { type: 'letter', label: 'h' },
  'm': { type: 'letter', label: 'm' },
  'n': { type: 'letter', label: 'n' },
  'l': { type: 'letter', label: 'l' },
  'ɹ': { type: 'letter', label: 'r' },
  'w': { type: 'letter', label: 'w' },
  'j': { type: 'letter', label: 'y' },

  // Common short vowels as letters
  'æ': { type: 'letter', label: 'a' },
  'e': { type: 'letter', label: 'e' },
  'ɪ': { type: 'letter', label: 'i' },
  'ɒ': { type: 'letter', label: 'o' },
  'ʊ': { type: 'letter', label: 'u' },
  'ə': { type: 'letter', label: 'ə' },
  'ʌ': { type: 'letter', label: 'u' },

  // Special characters
  ' ': { type: 'blank', label: 'space' },
  '.': { type: 'letter', label: '.' },
  '?': { type: 'letter', label: '?' },
  '!': { type: 'letter', label: '!' }
};

function parseIPA(ipaText) {
  const words = ipaText.split(' ');
  const result = [];

  words.forEach((word) => {
    const wordPhonemes = [];
    let i = 0;

    while (i < word.length) {
      let matched = false;

      // Try to match multi-character phonemes first (longest first)
      const possiblePhonemes = Object.keys(phonemeToVisual).sort((a, b) => b.length - a.length);

      for (const phoneme of possiblePhonemes) {
        if (word.slice(i, i + phoneme.length) === phoneme) {
          wordPhonemes.push({
            phoneme: phoneme,
            visual: phonemeToVisual[phoneme]
          });
          i += phoneme.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // If no match found, treat as unknown character
        wordPhonemes.push({
          phoneme: word[i],
          visual: { type: 'letter', label: word[i] }
        });
        i++;
      }
    }

    result.push(wordPhonemes);
  });

  return result;
}

function generateHTML(ipaText, title = 'IPA Sentence') {
  const parsedPhonemes = parseIPA(ipaText);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }

        .sentence-container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .title {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 24px;
        }

        .original-ipa {
            text-align: center;
            font-size: 18px;
            color: #666;
            margin-bottom: 30px;
            font-family: 'Doulos SIL', 'Charis SIL', serif;
        }

        .word-line {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }

        .phoneme-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 80px;
            height: 80px;
            padding: 10px;
            border-radius: 8px;
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            flex-shrink: 0;
        }

        .phoneme-item.has-image {
            background-color: #e3f2fd;
            border-color: #2196f3;
        }

        .phoneme-item.is-letter {
            background-color: #fff3e0;
            border-color: #ff9800;
        }

        .phoneme-item.is-blank {
            background-color: #f3e5f5;
            border-color: #9c27b0;
            width: 40px;
        }

        .visual-content {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .visual-content img {
            max-width: 60px;
            max-height: 60px;
            object-fit: contain;
        }

        .visual-content .letter {
            font-size: 36px;
            font-weight: bold;
            color: #333;
        }

        .visual-content .blank {
            font-size: 24px;
            color: #999;
        }
    </style>
</head>
<body>
    <div class="sentence-container">
        <h1 class="title">${title}</h1>
        <div class="original-ipa">Original IPA: /${ipaText}/</div>

        <div class="sentence-grid">
${parsedPhonemes.map(word => `            <div class="word-line">
${word.map(item => {
    const visual = item.visual;
    let cssClass = 'phoneme-item';
    let visualContent = '';

    if (visual.type === 'image') {
        cssClass += ' has-image';
        visualContent = `<img src="./public/images/${visual.src}" alt="${item.phoneme}">`;
    } else if (visual.type === 'letter') {
        cssClass += ' is-letter';
        visualContent = `<div class="letter">${visual.label}</div>`;
    } else if (visual.type === 'blank') {
        cssClass += ' is-blank';
        visualContent = `<div class="blank">␣</div>`;
    }

    return `                <div class="${cssClass}">
                    <div class="visual-content">
                        ${visualContent}
                    </div>
                </div>`;
}).join('\n')}
            </div>`).join('\n')}
        </div>
    </div>

    <div class="sentence-container">
        <h2>Instructions for Printing</h2>
        <p>This page is optimized for printing. Use your browser's print function (Ctrl+P or Cmd+P) to create a physical copy of this IPA sentence visualization.</p>
        <p><strong>Word Count:</strong> ${parsedPhonemes.length} words</p>
        <p><strong>Phoneme Count:</strong> ${parsedPhonemes.flat().length} symbols</p>
        <p><strong>Images used:</strong> ${parsedPhonemes.flat().filter(p => p.visual.type === 'image').length}</p>
        <p><strong>Letters used:</strong> ${parsedPhonemes.flat().filter(p => p.visual.type === 'letter').length}</p>
    </div>
</body>
</html>`;

  return html;
}

// Main function
function main() {
  const args = process.argv.slice(2);

  let ipaText = '';
  let outputFile = 'ipa-sentence.html';

  if (args.length === 0) {
    // Try to read from default input.txt file
    try {
      ipaText = fs.readFileSync('input.txt', 'utf8').trim();
      console.log(`Reading IPA from input.txt: "${ipaText}"`);
    } catch (error) {
      console.log('Usage: node ipa-to-html-fixed.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  "<IPA sentence>" [output-file.html]    - Direct IPA input');
      console.log('  -f <input-file> [output-file.html]    - Read from input file');
      console.log('  (no args)                             - Read from input.txt');
      console.log('');
      console.log('Examples:');
      console.log('  node ipa-to-html-fixed.js "gəʊ həʊm" output.html');
      console.log('  node ipa-to-html-fixed.js -f my-ipa.txt output.html');
      console.log('  node ipa-to-html-fixed.js  (reads from input.txt)');
      process.exit(1);
    }
  } else if (args[0] === '-f') {
    // Read from specified file
    if (args.length < 2) {
      console.error('Error: -f flag requires an input file');
      process.exit(1);
    }
    const inputFile = args[1];
    outputFile = args[2] || 'ipa-sentence.html';
    try {
      ipaText = fs.readFileSync(inputFile, 'utf8').trim();
      console.log(`Reading IPA from ${inputFile}: "${ipaText}"`);
    } catch (error) {
      console.error(`Error reading file ${inputFile}:`, error.message);
      process.exit(1);
    }
  } else {
    // Direct IPA input (original behavior)
    ipaText = args[0];
    outputFile = args[1] || 'ipa-sentence.html';
    console.log(`Converting IPA: "${ipaText}"`);
  }

  console.log(`Output file: ${outputFile}`);

  const html = generateHTML(ipaText, `IPA Sentence: ${ipaText}`);

  try {
    fs.writeFileSync(outputFile, html);
    console.log(`✅ HTML file generated successfully: ${outputFile}`);
    console.log(`📖 Open ${outputFile} in your browser to view the result`);
  } catch (error) {
    console.error('Error writing file:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { parseIPA, generateHTML, phonemeToVisual };
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const ffmpeg = require('ffmpeg-static');
const { spawn, execFile } = require('child_process');
const ffprobePath = require('ffprobe-static').path;
require('dotenv').config();

// Constants for directories and configuration
const OUTPUT_DIR = path.join(__dirname, '../public/audio/phonemes');
const TEMP_DIR = path.join(__dirname, '../temp');
const CORRUPT_DIR = path.join(__dirname, '../public/audio/corrupt');
const ERROR_LOG = path.join(__dirname, 'error.log');
const MAX_RETRIES = 3;
const BASE_DELAY = 5000;
const RATE_LIMIT_DELAY = 30000;

// Utility functions
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function logError(message, error = null) {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] ${message}${error ? `\n${error.stack || error}` : ''}\n`;
  await fs.promises.appendFile(ERROR_LOG, errorMessage, 'utf8');
  console.error(errorMessage);
}

async function isFileCorrupt(filePath) {
  return new Promise((resolve) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_streams', '-select_streams', 'a', '-of', 'json', filePath],
      (error, stdout) => {
        if (error) {
          console.log(`FFprobe error for file ${filePath}:`, error.message);
          resolve(true); // Treat file as corrupt
        } else {
          try {
            const streams = JSON.parse(stdout).streams || [];
            console.log(`FFprobe output for ${filePath}:`, streams);
            resolve(streams.length === 0); // No audio streams, file is corrupt
          } catch (parseError) {
            console.log(`Error parsing FFprobe output for ${filePath}:`, stdout);
            resolve(true); // Parsing error, consider file corrupt
          }
        }
      }
    );
  });
}

async function trimAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`\nStarting audio trim for ${path.basename(inputPath)}`);
    
    // Updated FFmpeg command to handle both start and end silence
    const ffmpegArgs = [
      '-i', inputPath,
      '-af', 'silenceremove=start_periods=1:start_duration=0.01:start_threshold=-50dB,silenceremove=stop_periods=1:stop_duration=0.01:stop_threshold=-50dB,volume=1.5',
      '-acodec', 'libmp3lame',
      '-ar', '24000',
      '-ac', '1',
      '-b:a', '160k',
      outputPath
    ];

    console.log('FFmpeg command:', ffmpegArgs.join(' '));

    const ffmpegProcess = spawn(ffmpeg, ffmpegArgs);

    let stderr = '';
    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('FFmpeg progress:', data.toString());
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully trimmed ${path.basename(inputPath)} to ${path.basename(outputPath)}`);
        resolve();
      } else {
        console.error(`FFmpeg error output:\n${stderr}`);
        reject(new Error(`ffmpeg process exited with code ${code}\n${stderr}`));
      }
    });

    ffmpegProcess.on('error', (err) => {
      console.error('FFmpeg process error:', err);
      reject(err);
    });
  });
}

// Mapping of IPA phonemes to URL-friendly filenames
const phonemeToFilename = {
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
  'ʧ': 'tsh',   // as in "church"
  'ʤ': 'dzh',   // as in "judge"
  'ɔ': 'aw',    // as in "thought"
  'ɑ': 'aa',    // as in "father"
  'ɛ': 'eh',    // as in "dress"
  'ɝ': 'ep',    // as in "nurse" (rhotic)
  'ɚ': 'er',    // as in "letter" (rhotic)
  'ɹ': 'turned-r', // as in "red"
  'ɜ': 'ow',    // as in "nurse" (non-rhotic)

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

// Define voices to generate audio for
const voices = [
  // British voices
  'en-GB-RyanNeural',
  'en-GB-LibbyNeural',
  'en-GB-SoniaNeural',
  // American voices
  'en-US-JennyNeural',
  'en-US-GuyNeural',
  'en-US-AriaNeural'
];

// Define phonemes to generate
const phonemes = [
  // Single phonemes
  'p', 'b', 't', 'd', 'k', 'g',
  'f', 'v', 'θ', 'ð', 's', 'z',
  'ʃ', 'ʒ', 'h', 'm', 'n', 'ŋ',
  'l', 'r', 'j', 'w', 'i', 'ɪ',
  'e', 'ɛ', 'æ', 'ɑ', 'ɒ', 'ɔ',
  'ʊ', 'u', 'ʌ', 'ə', 'ɜ', 'ɐ',
  'ɝ', 'ɚ', 'ɹ',
  // Combinations and long vowels
  'iː', 'ɑː', 'ɔː', 'uː', 'ɜː',
  'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'əʊ',
  'ɪə', 'eə', 'ʊə', 'ʧ', 'ʤ'
];

// Azure API configuration
const region = process.env.REACT_APP_AZURE_REGION;
const key = process.env.REACT_APP_AZURE_KEY;

if (!region || !key) {
  console.error('Please set REACT_APP_AZURE_REGION and REACT_APP_AZURE_KEY environment variables');
  process.exit(1);
}

async function generateAudio(text, voice, retryCount = 0) {
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voice}">
        <phoneme alphabet="ipa" ph="${text}">${text}</phoneme>
      </voice>
    </speak>`;

  try {
    console.log('\nRequest details:');
    console.log('URL:', url);
    console.log('Voice:', voice);
    console.log('Phoneme:', text);
    console.log('SSML:', ssml);

    const response = await axios({
      method: 'post',
      url: url,
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
        'User-Agent': 'IPAChat'
      },
      data: ssml,
      responseType: 'arraybuffer',
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Empty response from Azure TTS');
    }

    return response.data;
  } catch (error) {
    if (error.response?.status === 429 && retryCount < MAX_RETRIES) {
      const delay = RATE_LIMIT_DELAY * Math.pow(2, retryCount);
      await logError(`Rate limit hit. Retrying in ${delay / 1000}s. Retry ${retryCount + 1}/${MAX_RETRIES}`);
      await sleep(delay);
      return generateAudio(text, voice, retryCount + 1);
    }
    throw error;
  }
}

async function main() {
  try {
    // Create necessary directories
    await mkdir(OUTPUT_DIR, { recursive: true });
    await mkdir(TEMP_DIR, { recursive: true });
    await mkdir(CORRUPT_DIR, { recursive: true });

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (const voice of voices) {
      console.log(`\nProcessing voice: ${voice}`);
      
      for (const phoneme of phonemes) {
        try {
          const filenamePart = phonemeToFilename[phoneme] || phoneme;
          const outputFile = path.join(OUTPUT_DIR, `${filenamePart}_${voice}.mp3`);
          const tempFile = path.join(TEMP_DIR, `temp_${filenamePart}_${voice}.mp3`);

          // Check if file exists and is not corrupt
          if (fs.existsSync(outputFile)) {
            if (await isFileCorrupt(outputFile)) {
              console.log(`File ${outputFile} is corrupt. Will regenerate...`);
              await fs.promises.rename(outputFile, path.join(CORRUPT_DIR, `${filenamePart}_${voice}.mp3`));
            } else {
              console.log(`Skipping ${phoneme} (${filenamePart}) - file exists and is valid`);
              successCount++;
              continue;
            }
          }

          console.log(`Generating ${phoneme} (${filenamePart})`);
          
          // Try to generate valid audio with retries
          let success = false;
          for (let retry = 0; retry < MAX_RETRIES; retry++) {
            try {
              const audio = await generateAudio(phoneme, voice);
              await writeFile(tempFile, audio);

              if (await isFileCorrupt(tempFile)) {
                console.log(`Generated file is corrupt, retry ${retry + 1}/${MAX_RETRIES}`);
                continue;
              }

              // Trim silence and process audio
              await trimAudio(tempFile, outputFile);
              success = true;
              break;
            } catch (error) {
              console.error(`Error during generation attempt ${retry + 1}:`, error.message);
              await sleep(BASE_DELAY);
            }
          }

          if (success) {
            console.log(`Successfully generated ${outputFile}`);
            successCount++;
          } else {
            console.error(`Failed all attempts to generate ${phoneme}`);
            failureCount++;
            failures.push({ phoneme, voice, error: 'Failed all generation attempts' });
          }

          // Cleanup temp file
          try {
            await fs.promises.unlink(tempFile);
          } catch {}

          // Add a delay between phonemes
          await sleep(BASE_DELAY);
        } catch (error) {
          console.error(`Failed to generate ${phoneme} for ${voice}:`, error.message);
          failureCount++;
          failures.push({ phoneme, voice, error: error.message });
          await sleep(RATE_LIMIT_DELAY);
        }
      }
    }

    // Cleanup temp directory
    try {
      await fs.promises.rmdir(TEMP_DIR);
    } catch {}

    console.log('\nAudio generation complete!');
    console.log(`Successes: ${successCount}`);
    console.log(`Failures: ${failureCount}`);
    if (failures.length > 0) {
      console.log('\nFailed phonemes:');
      failures.forEach(({ phoneme, voice, error }) => {
        console.log(`- ${phoneme} (${voice}): ${error}`);
      });
    }
  } catch (error) {
    await logError('Failed to generate audio:', error);
    process.exit(1);
  }
}

main().catch(console.error);


const axios = require('axios');
require('dotenv').config();

const AZURE_KEY = process.env.REACT_APP_AZURE_KEY;
const AZURE_REGION = process.env.REACT_APP_AZURE_REGION;

async function testAzureTTS() {
    console.log('Testing Azure TTS with:');
    console.log('Region:', AZURE_REGION);
    console.log('Key length:', AZURE_KEY?.length);
    
    try {
        const response = await axios.post(
            `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
            `<speak version='1.0' xml:lang='en-GB'><voice xml:lang='en-GB' name='en-GB-LibbyNeural'>Hello</voice></speak>`,
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': AZURE_KEY,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
                },
                responseType: 'arraybuffer'
            }
        );
        
        console.log('Success! Response status:', response.status);
        console.log('Audio data length:', response.data.length);
        return true;
    } catch (error) {
        console.error('Error testing Azure TTS:');
        console.error('Status:', error.response?.status);
        console.error('Message:', error.message);
        if (error.response?.data) {
            try {
                const errorText = Buffer.from(error.response.data).toString();
                console.error('Error details:', errorText);
            } catch (e) {
                console.error('Raw error data:', error.response.data);
            }
        }
        return false;
    }
}

testAzureTTS();

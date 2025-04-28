const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
const cors = require('cors');

// Safer CORS
app.use(cors({
  origin: "*", // later lock to Twitch CDN domain if you want
}));

app.post('/speak', async (req, res) => {
  const { text, voice } = req.body;

  try {
    let audioResponse;

    if (voice.startsWith('openai-')) {
      const openaiVoice = voice.replace('openai-', '');

      audioResponse = await axios.post('https://api.openai.com/v1/audio/speech', {
        model: "tts-1-hd",
        input: text,
        voice: openaiVoice
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

    } else if (voice.startsWith('elevenlabs-')) {
      const voiceId = process.env.ELEVENLABS_VOICE_ID;
      audioResponse = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        text: text,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      }, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

    } else {
      throw new Error('Unsupported voice selection.');
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioResponse.data);

  } catch (error) {
    if (error.response && error.response.data) {
      const errorData = Buffer.from(error.response.data).toString('utf8');
      console.error("API Error:", errorData);
    } else {
      console.error(error.message);
    }
    res.status(500).send('Failed to generate speech');
  }
});

// --- Important: Add health check route for Railway
app.get('/', (req, res) => {
  res.send('TTS Server is running.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TTS server running on port ${PORT}`);
});

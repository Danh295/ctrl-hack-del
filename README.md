# AI Dating Simulator

A web-based dating simulator with an interactive 3D character model that speaks using AI-generated conversation (Gemini API) and realistic voice synthesis (ElevenLabs API) with synchronized lip movements.

## Features

- 🎮 **3D Character Model** - Interactive 3D character using Three.js
- 💬 **AI Conversation** - Natural dialogue powered by Google's Gemini API
- 🎤 **Realistic Voice** - Text-to-speech using ElevenLabs API
- 👄 **Lip Sync** - Real-time mouth animation synced to speech
- 🎨 **Modern UI** - Beautiful, responsive chat interface

## Setup Instructions

### 1. Get Your API Keys

#### Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

#### ElevenLabs API Key
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up for an account (free tier available)
3. Go to Profile Settings → API Keys
4. Copy your API key
5. Go to VoiceLab to find or create a voice
6. Copy the Voice ID from your chosen voice

### 2. Get a 3D Model

You have several options for getting a 3D character model:

#### Option A: Ready Player Me (Recommended)
1. Go to [Ready Player Me](https://readyplayer.me/)
2. Create a custom avatar
3. Copy the GLB model URL
4. Use the URL directly in config.js

#### Option B: Use Your Own Model
1. Place your GLB/GLTF model file in the project directory
2. Update the MODEL_URL in config.js to point to your local file
   ```javascript
   MODEL_URL: './models/character.glb'
   ```

#### Option C: Download Free Models
- [Mixamo](https://www.mixamo.com/) - Free rigged characters
- [Sketchfab](https://sketchfab.com/) - Free 3D models (filter for GLB/GLTF)

### 3. Configure the Application

Edit `config.js` and add your API keys and model URL:

```javascript
const CONFIG = {
    GEMINI_API_KEY: 'your-actual-gemini-api-key',
    ELEVENLABS_API_KEY: 'your-actual-elevenlabs-api-key',
    ELEVENLABS_VOICE_ID: 'your-chosen-voice-id',
    MODEL_URL: 'https://models.readyplayer.me/YOUR_MODEL_ID.glb',
    
    // Customize your character
    CHARACTER_NAME: 'Alex',
    CHARACTER_PERSONALITY: 'You are a friendly, charming person on a date...',
};
```

For development, create `.env.local` file inside `ctrl-hack-del` directory and add these API keys:

```
GEMINI_API_KEY=<your-gemini-api-key>
ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
ELEVENLABS_VOICE_ID=<your-elevenlabs-voice-id>
```

### 4. Run the Application

Since this uses ES modules and external APIs, you need to run it through a local server:

#### Option A: Using Python (simplest)
```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

#### Option B: Using Node.js
```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server

# Then open: http://localhost:8080
```

#### Option C: Using VS Code Live Server
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## Project Structure

```
ctrl-hack-del/
├── index.html          # Main HTML file with UI structure
├── styles.css          # Styling for the interface
├── config.js           # API keys and configuration
├── main.js            # Main JavaScript logic
└── README.md          # This file
```

## How It Works

1. **3D Rendering**: Uses Three.js to render and animate a 3D character model
2. **User Input**: User types a message in the chat interface
3. **AI Response**: Message is sent to Gemini API for an intelligent response
4. **Voice Generation**: AI response is converted to speech via ElevenLabs
5. **Lip Sync**: Audio is analyzed in real-time using Web Audio API
6. **Animation**: Character's mouth animates in sync with the speech

## Customization

### Change Character Personality

Edit the `CHARACTER_PERSONALITY` in `config.js`:

```javascript
CHARACTER_PERSONALITY: 'You are a mysterious detective investigating a case. Be analytical and ask probing questions.',
```

### Adjust Voice Settings

In `main.js`, modify the ElevenLabs voice settings:

```javascript
voice_settings: {
    stability: 0.5,        // 0-1: Lower = more expressive
    similarity_boost: 0.75 // 0-1: Higher = closer to original voice
}
```

### Modify Model Position/Lighting

In `main.js`, adjust the camera and lighting:

```javascript
camera.position.set(0, 1.6, 2); // x, y, z position
model.position.set(0, 0, 0);     // Adjust model position
```

## Troubleshooting

### Model not loading
- Check if MODEL_URL is correct and accessible
- Check browser console for errors
- Try the fallback cube (appears automatically if model fails)

### No AI response
- Verify your Gemini API key is correct
- Check browser console for API errors
- Ensure you have API quota remaining

### No voice/audio
- Verify your ElevenLabs API key and Voice ID
- Check if you have available characters quota
- Click "Voice: OFF" button to toggle voice

### Lip sync not working
- Ensure your 3D model has morph targets or blend shapes for mouth
- Check if model animations include mouth/talk animations
- Some models may not support lip sync

## API Costs

- **Gemini API**: Free tier includes 60 requests per minute
- **ElevenLabs**: Free tier includes 10,000 characters per month

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support (may need user interaction for audio)

## License

This is a demo project for educational purposes.

## Credits

- Three.js for 3D rendering
- Google Gemini for AI conversation
- ElevenLabs for voice synthesis
- Ready Player Me for avatar creation (optional)

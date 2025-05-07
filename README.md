# Interview Helper AI

**Interview Helper AI** is a real-time AI assistant designed to help users practice mock interviews by providing instant answers to questions. This **Electron-based** app listens to audio inputs and generates relevant responses, aiding users in refining their communication skills.

🚨 **Disclaimer:** This tool is strictly for mock interview **practice** and educational use. **Do not use it for real interviews.** The app is **in alpha stage**, quickly developed in **two days**, and lacks structured organization.

## 📌 Features
- **Instant AI-generated answers** to spoken interview questions.
- **Electron framework** for cross-platform functionality.
- **Microphone input processing** (currently does not support computer audio directly).
- **Fast prototype** with **minimal code structure**.

## 🔮 Future Enhancements
- **Context Adaptability**: Extend beyond interview scenarios.
- **Personalized Responses**: AI tailors answers based on user's profile and background.
- **Custom AI Models**: Support local model integrations.
- **Improved Transparency**: Make the app transparent for screen capture softwares or screen shares. Its currently hides contents from screen capture softwares but it's only black not fully transparent.
- **Computer Audio Support**: Make it listen to computer's sound (what is being played on the computer) it currently only listens to the mic. Or you have to manually route the computer sound to the mic input in order for the app to listen to the computer's audio.
- **Predictive Q&A**: Pridict or contemplate upcoming quesions and show the questions and the answers at the right side of the window without affecting the realtime part of the chat.

## 🚀 Installation
Ensure you have:
- [Node.js](https://nodejs.org/) installed.
- [Electron](https://www.electronjs.org/) set up.

### Steps:
1. Clone the repo:
   ```sh
   git clone https://github.com/your-username/interview-helper-ai.git
   cd interview-helper-ai
   
   npm install
   npm run start
   ```

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const Groq = require("groq-sdk");
const sbd = require("sbd");
const dotenv = require("dotenv");
dotenv.config();

/* ──────────────── Setup ──────────────── */
const app = express();
const server = http.createServer(app);
const webSocketServer = new WebSocket.Server({ server });
const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let keepAlive;
let transcriptBuffer = "";
let bufferTimer = null;
const BUFFER_DELAY_MS = 1500;

/* ──────────────── Utility Functions ──────────────── */

const isBufferComplete = (buffer) => {
    const sentences = sbd.sentences(buffer);
    const lastSentence = sentences[sentences.length - 1] || "";
    return /[.!?]\s*$/.test(lastSentence);
};

const resetBufferTimer = (callback) => {
    if (bufferTimer) clearTimeout(bufferTimer);
    bufferTimer = setTimeout(callback, BUFFER_DELAY_MS);
};

const sendToClient = (ws, data) => {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
};

/* ──────────────── Core Processing ──────────────── */

const processBufferWithGroq = async (ws) => {
    if (!transcriptBuffer || !isBufferComplete(transcriptBuffer)) {
        console.log("Buffer not complete yet:", transcriptBuffer);
        return;
    }

    try {
        ws.conversationContext.push({ role: "user", content: transcriptBuffer.trim() });

        const completion = await groq.chat.completions.create({
            messages: ws.conversationContext,
            model: "llama-3.3-70b-versatile",
        });

        const groqResponse = completion.choices[0]?.message?.content || "";
        console.log("Groq Response:", groqResponse);

        ws.conversationContext.push({ role: "assistant", content: groqResponse });

        sendToClient(ws, { type: "groq", content: groqResponse });
        transcriptBuffer = "";
    } catch (error) {
        console.error("Groq API Error:", error);
    }
};

/* ──────────────── Deepgram Setup ──────────────── */

const setupDeepgram = (webSocket) => {
    const deepgram = deepgramClient.listen.live({ smart_format: true, model: "nova-3" });

    if (keepAlive) clearInterval(keepAlive);
    keepAlive = setInterval(() => {
        console.log("deepgram: keepalive");
        deepgram.keepAlive();
    }, 10_000);

    deepgram.on(LiveTranscriptionEvents.Open, () => {
        console.log("deepgram: connected");
    });

    deepgram.on(LiveTranscriptionEvents.Transcript, (data) => {
        sendToClient(webSocket, data);

        if (data.is_final && data.channel?.alternatives?.[0]?.transcript) {
            transcriptBuffer += data.channel.alternatives[0].transcript + " ";
            resetBufferTimer(() => processBufferWithGroq(webSocket));
        }
    });

    deepgram.on(LiveTranscriptionEvents.Close, () => {
        console.log("deepgram: disconnected");
        clearInterval(keepAlive);
        deepgram.finish();
    });

    deepgram.on(LiveTranscriptionEvents.Error, (error) => {
        console.error("deepgram: error", error);
    });

    deepgram.on(LiveTranscriptionEvents.Warning, (warning) => {
        console.warn("deepgram: warning", warning);
    });

    deepgram.on(LiveTranscriptionEvents.Metadata, (data) => {
        sendToClient(webSocket, { metadata: data });
    });

    return deepgram;
};

/* ──────────────── New Prompt Handling ──────────────── */
const handleUserPrompt = async (ws, prompt) => {
    try {
        // Add user prompt to conversation context
        ws.conversationContext.push({
            role: "user",
            content: prompt.trim()
        });

        // Get Groq response
        const completion = await groq.chat.completions.create({
            messages: ws.conversationContext,
            model: "llama-3.3-70b-versatile",
        });

        const groqResponse = completion.choices[0]?.message?.content || "";
        console.log("Direct Prompt Response:", groqResponse);

        // Add assistant response to context and send to client
        ws.conversationContext.push({
            role: "assistant",
            content: groqResponse
        });

        sendToClient(ws, {
            type: "groq",
            content: groqResponse
        });
    } catch (error) {
        console.error("Prompt Handling Error:", error);
    }
};

/* ──────────────── WebSocket Handling ──────────────── */

webSocketServer.on("connection", (webSocket) => {
    console.log("webSocket: client connected");
    webSocket.conversationContext = [];
    let deepgram = setupDeepgram(webSocket);

    webSocket.on("message", (message) => {
        // Handle JSON prompts
        if (typeof message === 'string') {
            try {
                const data = JSON.parse(message);
                if (data.type === 'userPrompt') {
                    console.log("webSocket: received user prompt");
                    handleUserPrompt(webSocket, data.content);
                    return;
                }
            } catch (e) {
                console.error("Invalid JSON message:", e);
            }
        }

        // Handle audio streams
        console.log("webSocket: audio data received");
        const ready = deepgram.getReadyState();
        if (ready === 1) {
            console.log("webSocket: data sent to deepgram");
            deepgram.send(message);
        } else if (ready >= 2) {
            console.log("webSocket: retrying deepgram connection");
            deepgram.finish();
            deepgram.removeAllListeners();
            deepgram = setupDeepgram(webSocket);
        } else {
            console.log("webSocket: deepgram not ready");
        }
    });

    webSocket.on("close", () => {
        console.log("webSocket: client disconnected");
        deepgram.finish();
        deepgram.removeAllListeners();
        deepgram = null;
        transcriptBuffer = "";
        if (bufferTimer) clearTimeout(bufferTimer);
    });
});

/* ──────────────── Server Setup ──────────────── */

app.use(express.static("public/"));
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

server.listen(3000, () => {
    console.log("Server is listening on port 3000");
});

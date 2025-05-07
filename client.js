const captions = window.document.getElementById("captions");

async function getMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        return new MediaRecorder(stream, {mimeType: "audio/webm"});
    } catch (error) {
        console.error("error accessing microphone:", error);
        throw error;
    }
}

async function openMicrophone(microphone, socket) {
    return new Promise((resolve) => {
        microphone.onstart = () => {
            console.log("client: microphone opened");
            document.body.classList.add("recording");
            resolve();
        };

        microphone.onstop = () => {
            console.log("client: microphone closed");
            document.body.classList.remove("recording");
        };

        microphone.ondataavailable = (event) => {
            console.log("client: microphone data received");
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                socket.send(event.data);
            }
        };

        microphone.start(1000);
    });
}

async function closeMicrophone(microphone) {
    microphone.stop();
}

async function start(socket) {
    const listenButton = document.querySelector("#record");
    const startRecordingText = document.querySelector(".start-recording-text");
    let microphone;

    // Updated click handler
    listenButton.addEventListener("click", toggleRecording);

    window.electron.onStartRecording(async () => {
        if (!microphone) {
            await startRecording();
        }
    });

    window.electron.onStopRecording(async () => {
        if (microphone) {
            await stopRecording();
        }
    });

    async function toggleRecording() {
        if (!microphone) {
            await startRecording();
        } else {
            await stopRecording();
        }
    }

    async function startRecording() {
        try {
            microphone = await getMicrophone();
            await openMicrophone(microphone, socket);
            // Update button state
            startRecordingText.textContent = "Recording...";
            listenButton.classList.add("active");
        } catch (error) {
            console.error("Error opening microphone:", error);
            startRecordingText.textContent = "Start Recording";
            listenButton.classList.remove("active");
        }
    }

    async function stopRecording() {
        await closeMicrophone(microphone);
        microphone = undefined;
        // Reset button state
        startRecordingText.textContent = "Start Recording";
        listenButton.classList.remove("active");
    }
}

window.addEventListener("load", () => {
    const socket = new WebSocket("ws://localhost:3000");

    socket.addEventListener("open", async () => {
        console.log("client: connected to server");
        await start(socket);
    });

    // Update the message event listener:
    // Update the transcript handling in the message listener:
socket.addEventListener("message", (event) => {
    if (event.data === "") return;

    try {
        console.log("client: message received:", event.data);
        const data = JSON.parse(event.data);

        // Handle transcription - prepend to textarea
        if (data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript + '\n';
            captions.value = transcript + captions.value; // Add new text at top
        }

        // Handle Groq responses remains the same
        if (data.type === 'groq' && data.content) {
            const llmResponse = document.getElementById('llmResponse');
            llmResponse.innerHTML = `<p>${data.content}</p>`;
        }

    } catch (e) {
        console.error("Failed to parse JSON:", e);
    }
});

    socket.addEventListener("close", () => {
        console.log("client: disconnected from server");
    });
});

// Add send functionality
document.getElementById('sendTranscript').addEventListener('click', () => {
    const transcript = captions.value.trim();
    if (transcript && socket.readyState === WebSocket.OPEN) {
        // Send as user prompt
        socket.send(JSON.stringify({
            type: 'userPrompt',
            content: transcript
        }));
        // Optional: Clear the textarea after sending
        captions.value = '';
    }
});

// region Audio Visualizer 2
var paths = document.getElementsByTagName('path');
var visualizer = document.getElementById('visualizer');
var mask = visualizer.getElementById('mask');
var h = document.getElementsByTagName('h1')[0];
var path;
var report = 0;

var soundAllowed = function (stream) {
    //Audio stops listening in FF without // window.persistAudioStream = stream;
    //https://bugzilla.mozilla.org/show_bug.cgi?id=965483
    //https://support.mozilla.org/en-US/questions/984179
    window.persistAudioStream = stream;
    // h.innerHTML = "Thanks";
    // h.setAttribute('style', 'opacity: 0;');
    var audioContent = new AudioContext();
    var audioStream = audioContent.createMediaStreamSource(stream);
    var analyser = audioContent.createAnalyser();
    audioStream.connect(analyser);
    analyser.fftSize = 1024;

    var frequencyArray = new Uint8Array(analyser.frequencyBinCount);
    visualizer.setAttribute('viewBox', '0 0 255 255');

    //Through the frequencyArray has a length longer than 255, there seems to be no
    //significant data after this point. Not worth visualizing.
    for (var i = 0; i < 255; i++) {
        path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-dasharray', '4,1');
        mask.appendChild(path);
    }
    var doDraw = function () {
        requestAnimationFrame(doDraw);
        analyser.getByteFrequencyData(frequencyArray);
        var adjustedLength;
        for (var i = 0; i < 255; i++) {
            adjustedLength = Math.floor(frequencyArray[i]) - (Math.floor(frequencyArray[i]) % 5);
            paths[i].setAttribute('d', 'M ' + (i) + ',255 l 0,-' + adjustedLength);
        }

    }
    doDraw();
}

var soundNotAllowed = function (error) {
    // h.innerHTML = "You must allow your microphone.";
    console.log(error);
}

/*window.navigator = window.navigator || {};
/*navigator.getUserMedia =  navigator.getUserMedia       ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia    ||
                          null;*/
navigator.getUserMedia({audio: true}, soundAllowed, soundNotAllowed);
// endregion

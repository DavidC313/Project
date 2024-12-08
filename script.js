let audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Ensure AudioContext compatibility
let mediaRecorders = {};
let audioChunks = {
    guitar: [],
    bass: [],
    drums: []
};
let audioURLs = {
    guitar: null,
    bass: null,
    drums: null
};
let loopers = {};
let isMetronomeEnabled = false; // Metronome state
let combinedBlob = null; // Store combined recording
let mediaStreamDestinations = {}; // Define mediaStreamDestinations globally here


// Initialize Tone.js instruments and effects
let guitarSynth = new Tone.Synth().toDestination();
let bassSynth = new Tone.Synth().toDestination();
let drumsSynth = new Tone.MembraneSynth().toDestination();

// Metronome setup
let metronomeSynth = new Tone.MembraneSynth().toDestination();

// Effects
let effects = {
    chorus: new Tone.Chorus(4, 2.5, 0.5).toDestination(),
    distortion: new Tone.Distortion(0.4).toDestination(),
    phaser: new Tone.Phaser({ frequency: 15, octaves: 5, baseFrequency: 1000 }).toDestination()
};

// Volume controls
let guitarGain = new Tone.Gain(1).toDestination();
let bassGain = new Tone.Gain(1).toDestination();
let drumsGain = new Tone.Gain(1).toDestination();

// Analyzer for visualization
let analyzer = new Tone.Analyser("waveform", 256);
guitarSynth.connect(analyzer);
bassSynth.connect(analyzer);
drumsSynth.connect(analyzer);

// Synchronize BPM (Global Transport)
function setBPM() {
    let bpm = parseInt(document.getElementById("tempoControl").value);
    Tone.Transport.bpm.value = bpm;
}

// Call this function whenever the BPM input changes
document.getElementById("tempoControl").onchange = setBPM;
setBPM(); // Set the default BPM when the page loads

// Visual Feedback for instruments
function updateStatus(instrument, status) {
    document.getElementById(`${instrument}Status`).innerHTML = `${instrument} is ${status}`;
}

// Customize Guitar
function customizeGuitar() {
    let guitarType = document.getElementById("guitarType").value;
    if (guitarType === "electric") {
        guitarSynth = new Tone.Synth().toDestination();
    } else {
        guitarSynth = new Tone.Synth({
            oscillator: {
                type: "triangle"
            }
        }).toDestination();
    }
}

// Apply Effects
function applyEffect(instrument) {
    let effectType = document.getElementById(`${instrument}Effect`).value;
    let synth;
    
    if (instrument === 'guitar') {
        synth = guitarSynth;
    } else if (instrument === 'bass') {
        synth = bassSynth;
    } else if (instrument === 'drums') {
        synth = drumsSynth;
    }
    
    if (effectType === "none") {
        synth.disconnect();
        synth.toDestination();
    } else {
        synth.disconnect();
        synth.connect(effects[effectType]);
    }
}

// Play functions for each instrument based on the BPM
function playGuitar() {
    guitarSynth.triggerAttackRelease("C4", "8n", Tone.Transport.now());
    updateStatus("guitar", "playing");
}

function playBass() {
    bassSynth.triggerAttackRelease("C2", "8n", Tone.Transport.now());
    updateStatus("bass", "playing");
}

function playDrums() {
    drumsSynth.triggerAttackRelease("C1", "8n", Tone.Transport.now());
    updateStatus("drums", "playing");
}

// Unified Play function to trigger all instruments at once
function playAllInstruments() {
    playGuitar();
    playBass();
    playDrums();
}

// Adjust volume
document.getElementById("guitarVolume").oninput = function() {
    guitarGain.gain.value = this.value;
};

document.getElementById("bassVolume").oninput = function() {
    bassGain.gain.value = this.value;
};

document.getElementById("drumsVolume").oninput = function() {
    drumsGain.gain.value = this.value;
};

// Looping in sync with BPM
function loopRecording(instrument) {
    loopers[instrument] = new Tone.Loop(time => {
        if (instrument === "guitar") playGuitar();
        if (instrument === "bass") playBass();
        if (instrument === "drums") playDrums();
    }, "1m").start(0); // Looping every measure (1 bar)
    Tone.Transport.start();
    updateStatus(instrument, "looping");
}

// Start looping for all instruments at once
function loopAllInstruments() {
    loopRecording('guitar');
    loopRecording('bass');
    loopRecording('drums');
    Tone.Transport.start(); // Ensure the transport is running
}

// Stop looping
function stopRecording(instrument) {
    if (mediaRecorders[instrument]) {
        mediaRecorders[instrument].stop();
    }
    if (loopers[instrument]) {
        loopers[instrument].stop();
        updateStatus(instrument, "stopped");
    }
}

// Stop looping for all instruments
function stopAllInstruments() {
    stopRecording('guitar');
    stopRecording('bass');
    stopRecording('drums');
    Tone.Transport.stop(); // Stop the global transport
}

// Download individual instrument recording
function downloadRecording(instrument) {
    const audioBlob = new Blob(audioChunks[instrument], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${instrument}_recording.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Play back individual instrument recording
function playBack(instrument) {
    const audioBlob = new Blob(audioChunks[instrument], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
}

// Download combined recording
function downloadCombinedRecording() {
    const combinedChunks = [...audioChunks.guitar, ...audioChunks.bass, ...audioChunks.drums];
    combinedBlob = new Blob(combinedChunks, { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(combinedBlob);
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'combined_recording.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Play back combined recording
function playCombined() {
    if (combinedBlob) {
        const audioUrl = URL.createObjectURL(combinedBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    }
}

// Metronome
function toggleMetronome(enable) {
    isMetronomeEnabled = enable;
    if (isMetronomeEnabled) {
        Tone.Transport.scheduleRepeat((time) => {
            metronomeSynth.triggerAttackRelease("C2", "8n", time);
        }, "4n");
    } else {
        Tone.Transport.clear();
    }
}

// Visualization
function visualize() {
    const canvas = document.getElementById("audioVisualizer");
    const ctx = canvas.getContext("2d");

    function draw() {
        requestAnimationFrame(draw);

        const values = analyzer.getValue();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);

        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            const y = canvas.height / 2 + (value * canvas.height) / 2;
            ctx.lineTo(i * (canvas.width / values.length), y);
        }

        ctx.strokeStyle = "#ff6347";
        ctx.stroke();
    }

    draw();
}

visualize();


console.log("MediaStreamDestinations for guitar:", mediaStreamDestinations.guitar);


// Ensure AudioContext is resumed after a user interaction
document.body.addEventListener('click', async () => {
    if (audioContext.state === 'suspended') {
        await audioContext.resume(); // Resume AudioContext properly
        await Tone.start(); // Ensure Tone.js is started correctly
        console.log('AudioContext and Tone.js resumed.');
        initializeInstruments(); // Initialize instruments after AudioContext is resumed
    }
});

// Start recording for the selected instrument
function startRecording(instrument) {
    if (!mediaStreamDestinations[instrument]) {
        console.log(`${instrument} MediaStreamDestination not initialized`);
        return;
    }

    const stream = mediaStreamDestinations[instrument].stream;
    mediaRecorders[instrument] = new MediaRecorder(stream);

    // Clear previous chunks
    audioChunks[instrument] = [];

    mediaRecorders[instrument].ondataavailable = (event) => {
        console.log(`${instrument} data available`, event.data.size);
        if (event.data.size > 0) {
            audioChunks[instrument].push(event.data);
            console.log(`Added chunk for ${instrument}, total chunks: ${audioChunks[instrument].length}`);
        }
    };

    mediaRecorders[instrument].onstop = () => {
        console.log(`${instrument} recording stopped.`);
        if (audioChunks[instrument].length > 0) {
            const audioBlob = new Blob(audioChunks[instrument], { type: 'audio/wav' });
            audioURLs[instrument] = URL.createObjectURL(audioBlob);
            console.log(`${instrument} blob created, size: ${audioBlob.size}`);
        } else {
            console.log(`${instrument} has no audio chunks.`);
        }
    };

    mediaRecorders[instrument].start();
    console.log(`${instrument} recording started.`);
}

// Stop recording for the selected instrument
function stopRecording(instrument) {
    if (mediaRecorders[instrument] && mediaRecorders[instrument].state === "recording") {
        mediaRecorders[instrument].stop();
        console.log(`${instrument} recording stopping.`);
    }
}

// Play back the recording for the selected instrument
function playBack(instrument) {
    if (audioURLs[instrument]) {
        const audio = new Audio(audioURLs[instrument]);
        audio.play();
        console.log(`Playing ${instrument} recording.`);
    } else {
        console.log(`No recording available for ${instrument}.`);
    }
}

// Download the recording for the selected instrument
function downloadRecording(instrument) {
    if (audioURLs[instrument]) {
        const link = document.createElement('a');
        link.href = audioURLs[instrument];
        link.download = `${instrument}_recording.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`Downloaded ${instrument} recording.`);
    } else {
        console.log(`No recording available for ${instrument}.`);
    }
}

// Combine and download all recordings
function downloadCombinedRecording() {
    const combinedChunks = [...audioChunks.guitar, ...audioChunks.bass, ...audioChunks.drums];
    const combinedBlob = new Blob(combinedChunks, { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(combinedBlob);
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'combined_recording.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Play back combined recording
function playCombined() {
    const combinedChunks = [...audioChunks.guitar, ...audioChunks.bass, ...audioChunks.drums];
    const combinedBlob = new Blob(combinedChunks, { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(combinedBlob);
    const audio = new Audio(audioUrl);
    audio.play();
}

// Function to initialize Tone.js instruments and MediaStreamDestinations
function initializeInstruments() {
    // Initialize Tone.js instruments and effects
    let guitarSynth = new Tone.Synth().connect(audioContext.destination); // Connect guitar to audioContext
    let bassSynth = new Tone.Synth().connect(audioContext.destination); // Connect bass to audioContext
    let drumsSynth = new Tone.MembraneSynth().connect(audioContext.destination); // Connect drums to audioContext

    // Create MediaStreamDestinations for each instrument using Web Audio API
    mediaStreamDestinations.guitar = audioContext.createMediaStreamDestination();  // Use Web Audio API
    mediaStreamDestinations.bass = audioContext.createMediaStreamDestination();    // Use Web Audio API
    mediaStreamDestinations.drums = audioContext.createMediaStreamDestination();   // Use Web Audio API

    // Connect instruments to their respective MediaStreamDestinations
    guitarSynth.connect(mediaStreamDestinations.guitar); // Connect guitar synth to its MediaStreamDestination
    bassSynth.connect(mediaStreamDestinations.bass);     // Connect bass synth to its MediaStreamDestination
    drumsSynth.connect(mediaStreamDestinations.drums);   // Connect drum synth to its MediaStreamDestination

    console.log("Instruments and MediaStreamDestinations initialized.");
}


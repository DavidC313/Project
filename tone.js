let audioContext = new AudioContext();
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

// Initialize Tone.js instruments
let guitarSynth = new Tone.Synth().toDestination();
let bassSynth = new Tone.Synth().toDestination();
let drumsSynth = new Tone.MembraneSynth().toDestination();

// Play functions for each instrument
function playGuitar() {
    guitarSynth.triggerAttackRelease("C4", "8n");
}

function playBass() {
    bassSynth.triggerAttackRelease("C2", "8n");
}

function playDrums() {
    drumsSynth.triggerAttackRelease("C1", "8n");
}

// Start recording function
function startRecording(instrument) {
    let mediaStreamDestination = audioContext.createMediaStreamDestination();
    
    // Connect the instrument's output to the destination
    if (instrument === 'guitar') {
        guitarSynth.connect(mediaStreamDestination);
    } else if (instrument === 'bass') {
        bassSynth.connect(mediaStreamDestination);
    } else if (instrument === 'drums') {
        drumsSynth.connect(mediaStreamDestination);
    }
    
    mediaRecorders[instrument] = new MediaRecorder(mediaStreamDestination.stream);
    
    // Push audio chunks
    mediaRecorders[instrument].ondataavailable = (event) => {
        audioChunks[instrument].push(event.data);
    };
    
    // Start recording
    mediaRecorders[instrument].start();
    console.log(`${instrument} recording started.`);
}

// Stop recording function
function stopRecording(instrument) {
    mediaRecorders[instrument].stop();
    mediaRecorders[instrument].onstop = () => {
        const audioBlob = new Blob(audioChunks[instrument], { type: 'audio/wav' });
        audioURLs[instrument] = URL.createObjectURL(audioBlob);
        console.log(`${instrument} recording stopped.`);
    };
}

// Play all tracks function
function playAllTracks() {
    if (audioURLs.guitar) {
        const guitarAudio = new Audio(audioURLs.guitar);
        guitarAudio.play();
    }
    if (audioURLs.bass) {
        const bassAudio = new Audio(audioURLs.bass);
        bassAudio.play();
    }
    if (audioURLs.drums) {
        const drumsAudio = new Audio(audioURLs.drums);
        drumsAudio.play();
    }
}

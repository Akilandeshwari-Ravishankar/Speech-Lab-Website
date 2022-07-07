
//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						                                    //stream from getUserMedia()
var rec; 							                                    //Recorder.js object    
var input; 							                                    //MediaStreamAudioSourceNode we'll be recording
 
var AudioContext = window.AudioContext || window.webkitAudioContext;    // shim for AudioContext when it's not avb.
var audioContext;                                                       //audio context to help us record

var recordingText = document.getElementById('recording-text');
var recordButton = document.getElementById('btn-record');
var recordingControls = document.getElementById('recording-btns');
var pauseButton = document.getElementById('btn-pause');
var stopButton = document.getElementById('btn-stop'); 
var recordingsList = document.getElementById('recordings-list'); 
var displayRecordings = document.getElementById('display-recordings');
var submitButton = document.getElementById('btn-submit');

// add event listeners
recordButton.addEventListener("click", startRecording);
pauseButton.addEventListener("click", pauseRecording);
stopButton.addEventListener("click", stopRecording);


function startRecording() {
    console.log("Started Recording");
    recordButton.style.color = "red";
    recordButton.style.border.color = "red";
    recordingControls.style.display = "block";
    recordingText.innerHTML = "Recording in progress...";

    var constraints = { audio: true, video:false };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

        audioContext = new AudioContext();

        console.log("Format: 1 channel pcm @" + audioContext.sampleRate/1000 + "kHz");

        gumStream = stream;

        input = audioContext.createMediaStreamSource(stream);

        rec = new Recorder(input, {numChannels:1})

        rec.record();

        console.log("Recording started");

    }).catch(function(err) {
        recordingControls.style.display = "none";
        recordingText.innerHTML = "Error occurred while recording. Click to record again!";
    })

}

function pauseRecording() {
    console.log("pauseButton clicked rec.recording=", rec.recording);
    recordingText.innerHTML = "Recording paused. Resume to continue recording"
    if(rec.recording) {
        rec.stop();
        pauseButton.innerHTML = "Resume";
        pauseButton.style.background = "#2056AC";
        pauseButton.style.color = "white";
    } else {
        rec.record();
        pauseButton.innerHTML = "Pause";
    }
}

function stopRecording() {
    console.log("stopButton clicked");

    recordingText.innerHTML = "Finished recording. Click to record again!";

    pauseButton.innerHTML = "Pause";

    recordingControls.style.display = "none";
    recordButton.style.color = "#909090";
    recordButton.style.border.color = "grey";
    pauseButton.style.background = "transparent";
    pauseButton.style.color = "#2056AC"; 

    rec.stop();

    gumStream.getAudioTracks()[0].stop();

    rec.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {
    var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	var li = document.createElement('li');

	//name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

	//add the new audio element to li
	li.appendChild(au);

	//add the li element to the ol
	recordingsList.appendChild(li);

    submitButton.style.display = "inline-block";

}


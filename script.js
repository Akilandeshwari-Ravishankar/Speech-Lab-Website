class Recordings {
    constructor(id, audio) {
        this.id = id;
        this.audio = audio;
    }
}

var recordingsArray = [];
var recordingId=0;
var timeAndDateHandling = {
    /** Computes the elapsed time since the moment the function is called in the format mm:ss or hh:mm:ss
     * @param {String} startTime - start time to compute the elapsed time since
     * @returns {String} elapsed time in mm:ss format or hh:mm:ss format if elapsed hours are 0.
     */
    getElapsedTime: function (startTime) {

        // Record end time
        let endTime = new Date();

        // Compute time difference in milliseconds
        let timeDiff = endTime.getTime() - startTime.getTime();

        // Convert time difference from milliseconds to seconds
        timeDiff = timeDiff / 1000;

        // Extract integer seconds that dont form a minute using %
        let seconds = Math.floor(timeDiff % 60); //ignoring uncomplete seconds (floor)

        // Pad seconds with a zero if neccessary
        let secondsAsString = seconds < 10 ? "0" + seconds : seconds + "";

        // Convert time difference from seconds to minutes using %
        timeDiff = Math.floor(timeDiff / 60);

        // Extract integer minutes that don't form an hour using %
        let minutes = timeDiff % 60; //no need to floor possible incomplete minutes, becase they've been handled as seconds

        // Pad minutes with a zero if neccessary
        let minutesAsString = minutes < 10 ? "0" + minutes : minutes + "";

        // Convert time difference from minutes to hours
        timeDiff = Math.floor(timeDiff / 60);

        // Extract integer hours that don't form a day using %
        let hours = timeDiff % 24; //no need to floor possible incomplete hours, becase they've been handled as seconds

        // Convert time difference from hours to days
        timeDiff = Math.floor(timeDiff / 24);

        // The rest of timeDiff is number of days
        let days = timeDiff;

        let totalHours = hours + (days * 24); // add days to hours
        let totalHoursAsString = totalHours < 10 ? "0" + totalHours : totalHours + "";

        if (totalHoursAsString === "00") {
            return minutesAsString + ":" + secondsAsString;
        } else {
            return totalHoursAsString + ":" + minutesAsString + ":" + secondsAsString;
        }
    }
}

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
var elapsedTimeEl = document.getElementById('elapsed-time');
var elapsedTimeText = document.getElementsByClassName('elapsed-time-text')[0];
var recordingsCard = document.getElementById('recordings-card');

var elapsedTimeIntervalRef;
var startTime;
var elapsedTimeWhenPaused;


// add event listeners
recordButton.addEventListener("click", startRecording);
pauseButton.addEventListener("click", pauseRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
    console.log("Started Recording");
    recordButton.style.display = "none";
    elapsedTimeEl.style.display = "block";

    // recordButton.style.color = "red";
    // recordButton.style.border.color = "red";
    recordingControls.style.display = "block";
    recordingText.innerHTML = "Recording in progress...";

    var constraints = { audio: true, video:false };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

        audioContext = new AudioContext({
            sampleRate: 16000
        });
        
        console.log("Format: 1 channel pcm @" + audioContext.sampleRate/1000 + "kHz");

        gumStream = stream;

        input = audioContext.createMediaStreamSource(stream);

        rec = new Recorder(input, {numChannels:1})

        rec.record();
        setStartTime();
        elapsedTimeIntervalRef = setInterval(() => {
            // Compute the elapsed time & display
            elapsedTimeText.innerText = timeAndDateHandling.getElapsedTime(startTime); //pass the actual record start time
    
            // Improvement: Can Stop elapsed time and resert when a maximum elapsed time
            //              has been reached.
        }, 1000);

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
        pauseButton.style.background = "transparent";
        pauseButton.style.color = "#2056AC";
    }
    // Clear interval
    if (typeof elapsedTimeIntervalRef !== "undefined") {
        clearInterval(elapsedTimeIntervalRef);
        elapsedTimeIntervalRef = undefined;
    }
    // Store the elapsed time on pause
    storeElapsedTimeOnPause();
}

function stopRecording() {
    console.log("stopButton clicked");
    elapsedTimeEl.style.display = "none";
    recordButton.style.display = "inline-block";

    recordingText.innerHTML = "Finished recording. Click to record again!";

    pauseButton.innerHTML = "Pause";

    recordingControls.style.display = "none";
    recordButton.style.color = "#909090";
    recordButton.style.border.color = "grey";
    pauseButton.style.background = "transparent";
    pauseButton.style.color = "#2056AC"; 

    rec.stop();
    if (typeof elapsedTimeIntervalRef !== "undefined") {
        clearInterval(elapsedTimeIntervalRef);
        elapsedTimeIntervalRef = undefined;
    }

    // Reset elapsed time when paused object
    elapsedTimeWhenPaused = undefined

    // Reset elapsed time text
    elapsedTimeText.innerText = "00:00";

    gumStream.getAudioTracks()[0].stop();

    rec.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {
    recordingId++;

    var url = URL.createObjectURL(blob);
	var au = document.createElement('audio');
	// var li = document.createElement('li');
    var tr = document.createElement('tr');
    var tdCheckboxEl = document.createElement('td');
    var tdTimeStampEl = document.createElement('td');
    var checkboxEl = document.createElement('input');
    var tdRecordingEl = document.createElement('td');
    var tdDeleteEl = document.createElement('td');
    var deleteBtn = document.createElement('button');
    var deleteBtnIcon = document.createElement('i');

    //name of .wav file to use during upload and download (without extendion)
	var filename = new Date().toISOString();

	//add controls to the <audio> element
	au.controls = true;
	au.src = url;

    tdCheckboxEl.classList.add('align-middle');
    checkboxEl.type = 'checkbox';
    checkboxEl.name = 'select-item';
    checkboxEl.classList.add('select-item');
    checkboxEl.classList.add('checkbox');
    // checkboxEl.value = recordingId + 1;
    tdTimeStampEl.classList.add('align-middle');
    tdTimeStampEl.innerHTML = recordingId + '.';    ;
    tdRecordingEl.classList.add('align-middle');
    tdDeleteEl.classList.add('align-middle');
    deleteBtnIcon.classList.add('fa');
    deleteBtnIcon.classList.add('fa-trash');
    deleteBtn.classList.add('btn-delete');

    // tdCheckboxEl.appendChild(checkboxEl);
    tdRecordingEl.appendChild(au);
    deleteBtn.appendChild(deleteBtnIcon);
    tdDeleteEl.appendChild(deleteBtn);
    // tr.appendChild(tdCheckboxEl);
    tr.appendChild(tdTimeStampEl);
    tr.appendChild(tdRecordingEl);
    tr.appendChild(tdDeleteEl);

    //add event listeners to the elements 
    tdDeleteEl.addEventListener('click', function() {
        tdDeleteEl.parentNode.parentNode.removeChild(tdDeleteEl.parentNode); 
        if(document.getElementById('recordings-list').childNodes.length === 1) {
            submitButton.style.display = "none";
            recordingsCard.style.display = "none";
            recordingText.innerHTML = "All the recordings are deleted. Click to record again!"
        }
    });

    //create Recording Class object and append to array
    let recordings = new Recordings(recordingId, au);
    recordingsArray.push(recordings);

	//add the row element to the table
	recordingsList.appendChild(tr);

    if(document.getElementById('recordings-list').childNodes.length > 1) {
        recordingsCard.style.display = "block";
    }

    submitButton.style.display = "inline-block";
    console.log(recordingsArray);
}

function setStartTime() {
    if (elapsedTimeWhenPaused) {
        startTime = new Date();
        // Subtract the elapsed hours, minutes and seconds from the current date
        // To get correct elapsed time to resume from it
        startTime.setHours(startTime.getHours() - elapsedTimeWhenPaused.hours);
        startTime.setMinutes(startTime.getMinutes() - elapsedTimeWhenPaused.minutes);
        startTime.setSeconds(startTime.getSeconds() - elapsedTimeWhenPaused.seconds);
    } else {
        startTime = new Date();
    }
}

function storeElapsedTimeOnPause() {
    // Break down elapsed time from display test
    const brokenDownElapsedTime = elapsedTimeText.innerText.split(":");

    // Convert list to numbers
    const brokenDownElapsedTimeAsNumbers = brokenDownElapsedTime.map(numberAsString => parseInt(numberAsString));

    // Store the hours minutes and seconds from that time
    elapsedTimeWhenPaused = {
        hours: brokenDownElapsedTimeAsNumbers.length === 3 ? brokenDownElapsedTimeAsNumbers[0] : 0,
        minutes: brokenDownElapsedTimeAsNumbers.length === 3 ? brokenDownElapsedTimeAsNumbers[1] : brokenDownElapsedTimeAsNumbers[0],
        seconds: brokenDownElapsedTimeAsNumbers.length === 3 ? brokenDownElapsedTimeAsNumbers[2] : brokenDownElapsedTimeAsNumbers[1]
    }
}

/*
<tr>
    <th>
        <input type="checkbox" class="select-all checkbox" name="select-all" />
    </th>
    <th>Recording</th>
    <th><button class="btn-delete"><i class="fa fa-trash"></i></button></th>
</tr>
*/
var display = document.getElementById('timer');
var secs = 0;
var mins = 0;
var hrs  = 0;
var h = "";
var m = "";
var s = "";
var timer;

function countTimer(){
	secs++;
	
	if(secs >= 60){
		secs = 0;
		mins++;
		if(mins >= 60){
			mins = 0;
			hrs++;
		}
	}
	
	h = hrs ? hrs > 9 ? hrs : "0" + hrs : "00";
	m = mins ? mins > 9 ? mins : "0" + mins : "00";
	s = secs > 9 ? secs : "0" + secs;
	
	display.innerHTML = h+":"+m+":"+s+"s";
	
	timerDuration();
}

function timerDuration(){
	if(hrs != 99){
		timer = setTimeout(countTimer, 100);
	}
	
}

function startTimer(btn){
	btn.setAttribute('disabled', 'disabled');
	timerDuration();
	
}


function stopTimer(){
	document.getElementsByClassName('btn-success')[0].removeAttribute('disabled');
	clearTimeout(timer);
}

function resetTimer(){
	document.getElementsByClassName('btn-success')[0].removeAttribute('disabled');
	clearTimeout(timer);
	display.innerHTML = "00:00:00s";
	secs = 0; 
	mins = 0; 
	hrs = 0;
	h = "";
	m = "";
	s = "";
}
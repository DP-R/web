document.getElementById("botImage").onclick = myfun2;

function currentTime() {
	var date = new Date(); /* creating object of Date class */
	var hour = date.getHours();
	var min = date.getMinutes();
	var sec = date.getSeconds();
	var year = date.getFullYear();
	var month = date.getMonth();
	var day = date.toDateString();
	var milli = date.getMilliseconds();
	var midday = "AM";
	midday = (hour >= 12) ? "PM" : "AM"; /* assigning AM/PM */
	hour = (hour == 0) ? 12 : ((hour > 12) ? (hour) : hour); /* assigning hour in 12-hour format */
	hour = updateTime(hour);
	min = updateTime(min);
	sec = updateTime(sec);
	milsec=(hour*3600+min*60+sec);
	document.getElementById("digiclock").innerHTML = `${hour}:${min}<div id="millisec">${sec}</div>`; /* adding time to the div */
	// document.getElementById("digiclock").inner
	document.getElementById("digical").innerText = `${day}`;
	var t = setTimeout(currentTime, 1000); /* setting timer */
}

function updateTime(k) {
	/* appending 0 before time elements if less than 10 */
	if (k < 10) {
		return "0" + k;
	} else {
		return k;
	}
}

currentTime();

var j = 1;

function myfun2() {
	j = j + 1;
	if (j == 5) {
		window.open("https://docs.google.com/spreadsheets/d/1c1QwvQsgA6V_1HNO9VrLc6PD5knGzLkCogt2KvXNzt4/edit#gid=59662764");
		j = 1;
	}
}

var modal = document.getElementById("id01");
var sidebar = document.getElementById("mySidebar");
window.onclick = function (event) {
	if (event.target == modal) {
		modal.style.display = "none";
		sidebar.style.display="none";
	}
	// openFullscreen();
}

var i = 0;
var txt = "I'm Purnendra"; /* The text */
var speed = 150; /* The speed/duration of the effect in milliseconds */
function typeWriter() {
	if (i < txt.length) {
		document.getElementById("demo").innerHTML += txt.charAt(i);
		i++;
		setTimeout(typeWriter, speed);
	}
}
typeWriter();


// var elem = document.documentElement;
// function openFullscreen() {
// 	if (elem.requestFullscreen) {
// 		elem.requestFullscreen();
// 	} else if (elem.mozRequestFullScreen) { /* Firefox */
// 		elem.mozRequestFullScreen();
// 	} else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
// 		elem.webkitRequestFullscreen();
// 	} else if (elem.msRequestFullscreen) { /* IE/Edge */
// 		elem.msRequestFullscreen();
// 	}
// }
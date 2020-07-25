function currentTime() {
	var date = new Date(); /* creating object of Date class */
	var hour = date.getHours();
	var min = date.getMinutes();
	var sec = date.getSeconds();
	var year = date.getFullYear();
	var month = date.getMonth();
	var day = date.toDateString();
	var midday = "AM";
	midday = (hour >= 12) ? "PM" : "AM"; /* assigning AM/PM */
	hour = (hour == 0) ? 12 : ((hour > 12) ? (hour - 12): hour); /* assigning hour in 12-hour format */
	hour = updateTime(hour);
	min = updateTime(min);
	sec = updateTime(sec);
	document.getElementById("digiclock").innerText = `${hour}:${min}:${sec} ${midday}`; /* adding time to the div */
	document.getElementById("digical").innerText = `${day}`;
	  var t = setTimeout(currentTime, 1000); /* setting timer */
  }
  
  function updateTime(k) { /* appending 0 before time elements if less than 10 */
	if (k < 10) {
	  return "0" + k;
	}
	else {
	  return k;
	}
  }
  
  currentTime();
var i=1;
var j=1;
function myfun1(){
	// window.open("");
	i=i+1;
	if(i ==5){
		window.open("https://calendar.google.com/calendar/r");
		i=1;
	}
}
function myfun2(){
	j=j+1;
	if(j ==5){
		window.open("https://docs.google.com/spreadsheets/d/1c1QwvQsgA6V_1HNO9VrLc6PD5knGzLkCogt2KvXNzt4/edit#gid=59662764");
		j=1;
	}
	
}
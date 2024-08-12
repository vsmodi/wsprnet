//scripts.js
"use strict";

/* red pin icon */
var RedPinIcon = L.icon({
    iconUrl: 'red_pin.png',
    iconSize: [25, 25],
});

/* Database values will be loaded into the following arrays */

var time = [];
var band = [];
var rx_sign = [];
var rx_lat = [];
var rx_lon = [];
var rx_loc = [];
var tx_sign = [];
var tx_lat = [];
var tx_lon = [];
var tx_loc = [];
var distance = [];
var tx_azimuth = [];
var rx_azimuth = [];
var frequency = [];
var power = [];
var snr = [];
var drift = [];
var version = [];
var code = [];
var altitude = []      // Altitude is a calculated value

var Reporter = "";
var FromDate = "";
var ToDate = "";

var wsprDataPoints;         // Number of data values from WSPR database
var wsprSpots;              // Number of unique balloon spots
var wsprListeners;          // Number of unique listeners


/* Create the Power Table to Calculate the Altitude */
/* Contains Power dBm, Power Watt, Altitude (min), Altitude (max), Altitude (avg), Altitude (ft) */
var powerTable = []
powerTable.push([0,	 0.001,	0,      900     ,0,0]);
powerTable.push([3,	 0.002,	900,	2100    ,0,0]);
powerTable.push([7,  0.005,	2100,	3000    ,0,0]);
powerTable.push([10, 0.01,	3000,	3900    ,0,0]);
powerTable.push([13, 0.02,	3900,	5100    ,0,0]);
powerTable.push([17, 0.05,	5100,	6000    ,0,0]);
powerTable.push([20, 0.1,	6000,	6900    ,0,0]);
powerTable.push([23, 0.2,	6900,	8100    ,0,0]);
powerTable.push([27, 0.5,	8100,	9000    ,0,0]);
powerTable.push([30, 1,	    9000,	9900    ,0,0]);
powerTable.push([33, 2,	    9900,	11190   ,0,0]);
powerTable.push([37, 5,	    11190,	12000   ,0,0]);
powerTable.push([40, 10,	12000,	12900   ,0,0]);
powerTable.push([43, 20,	12900,	14100   ,0,0]);
powerTable.push([47, 50,	14100,	15000   ,0,0]);
powerTable.push([50, 100,	15000,	15900   ,0,0]);
powerTable.push([53, 200,	15900,	17100   ,0,0]);
powerTable.push([57, 500,	17100,	18000   ,0,0]);
powerTable.push([60, 1000,	18000,	18000   ,0,0]);

for (var i = 0; i < powerTable.length; i++) {
    // Since the a given values is a range of altitudes, we will average the upper and lower values
    powerTable[i][4] = Math.round((powerTable[i][2] + powerTable[i][3]) / 2)
    // powertable is in meters, so we will convert it to ft
    powerTable[i][5] = Math.round(powerTable[i][4] * 3.28084)
}

async function ProcessForm() {
"use strict";

/* Set all of the containers to no display */
    document.getElementById("ReporterError").innerHTML = "";
    document.getElementById("map").style.display = "none";  
    document.getElementById("mapcontainer").style.display = "none";  
    document.getElementById("data").style.display = "none";   

    // Ensure that a Callsign was entered
      Reporter = document.getElementById("Reporter").value;
      if (Reporter != "") { 
  
        /* Display the containers based on the selection */
        if (document.getElementById("rdShowMapAndListeners").checked || document.getElementById("rdShowMap").checked) {
            document.getElementById("mapcontainer").style.display = "block";    
            document.getElementById("map").style.display = "block";              
        }
        if (document.getElementById("rdShowData").checked) {
            document.getElementById("data").style.display = "block";              
        }

        /* If FromDate is blank, use an arbitrary start date */
        FromDate = document.getElementById("FromDate").value;
        if (FromDate == "") {
            FromDate = "2010-01-01"
        }

        /* if ToDate is blank, use todays date */
        ToDate = document.getElementById("ToDate").value;
        if (ToDate == "") {
            ToDate =  new Date().toISOString().slice(0, 10);
        }

        document.getElementById("status").innerHTML = "Retrieving Data from Database...";  

        /* Create URL for AJAX Call */
        var wsprURL = "https://db1.wspr.live/?query=SELECT * FROM wspr.rx where tx_sign = '" + Reporter + "' and time >= '" + FromDate + "' and time <= '" + ToDate + "' ORDER BY time ASC FORMAT JSON"

        /* Make the AJAX call */
        var wsprObject = await fetch(wsprURL);

        /* Check the return status */
        if (wsprObject.status == 200) {
            
            // Good status - get the text
            var wsprJSONText = await wsprObject.text();
            // Parse the JSON string into an object
            var wsprData = JSON.parse(wsprJSONText);

            /* Pull the data from the message object and place it in local variables */
            wsprDataPoints = wsprData.data.length;
            for (var i = 0; i < wsprDataPoints; i++) {
                time[i] = wsprData.data[i].time;
                band[i] = wsprData.data[i].band;
                rx_sign[i] = wsprData.data[i].rx_sign;
                rx_lat[i] = wsprData.data[i].rx_lat;
                rx_lon[i] = wsprData.data[i].rx_lon;
                rx_loc[i] = wsprData.data[i].rx_loc;
                tx_sign[i] = wsprData.data[i].tx_sign;
                tx_lat[i] = wsprData.data[i].tx_lat;
                tx_lon[i] = wsprData.data[i].tx_lon;
                tx_loc[i] = wsprData.data[i].tx_loc;
                distance[i] = wsprData.data[i].distance;
                tx_azimuth[i] = wsprData.data[i].azimuth;
                rx_azimuth[i] = wsprData.data[i].rx_azimuth;
                frequency[i] = wsprData.data[i].frequency;
                power[i] = wsprData.data[i].power;
                snr[i] = wsprData.data[i].snr;
                drift[i] = wsprData.data[i].drift;
                version[i] = wsprData.data[i].version;
                code[i] = wsprData.data[i].code;
                altitude[i] = calcAltitude(power[i]); // Calculate Altitude from power
            }
            if (wsprDataPoints > 0) {
                if (document.getElementById("rdShowMap").checked) {
                    document.getElementById("status").innerHTML = "Drawing Map...";  
                    showMap(false);
                    document.getElementById("status").innerHTML = "Map Complete...Datapoints: " + wsprDataPoints + "...Spots: " + wsprSpots + "...Listeners: " + wsprListeners;   
                }            
                if (document.getElementById("rdShowMapAndListeners").checked) {
                    document.getElementById("status").innerHTML = "Drawing Map...";  
                    showMap(true);
                    document.getElementById("status").innerHTML = "Map Complete...Datapoints: " + wsprDataPoints + "...Spots: " + wsprSpots + "...Listeners: " + wsprListeners;   
                }            
                if (document.getElementById("rdShowData").checked) {
                    document.getElementById("status").innerHTML = "Drawing Map...";  
                    showData();
                    document.getElementById("status").innerHTML = "Datapoints: " + wsprDataPoints; 
                }            
                if (document.getElementById("rdDownloadCSVData").checked) {
                    document.getElementById("status").innerHTML = "Downloading Data...";  
                    downloadCSVFile();
                    document.getElementById("status").innerHTML = "Datapoints: " + wsprDataPoints; 
                }            
                if (document.getElementById("rdDownloadJSONData").checked) {
                    document.getElementById("status").innerHTML = "Downloading Data...";  
                    downloadJSONFile();
                    document.getElementById("status").innerHTML = "Datapoints: " + wsprDataPoints; 
                }
            }
        } else {
            /* AJAX complete with error */
            alert("Error Detected - Status: " + wsprData.status)
            return;
        }       
    } else {
        document.getElementById("ReporterError").innerHTML = "Required";
    }
    
}

function calcAltitude(power) {
"use strict";
    if (power == 0) {
        return 0
    }
    for (var i = 0; i < powerTable.length; i++) {
        if (power < powerTable[i][1]) {
            return powerTable[i-1][5]
        }
    }
    return 0
}

function showData() {
"use strict";

    /* Display the table header */
    var table = "<table>";
    table = table + "<tr>"
    table = table + "<th>Date/Time</th>";
    table = table + "<th>Band</th>";
    table = table + "<th>RX Sign</th>";
    table = table + "<th>RX Lat</th>";
    table = table + "<th>RX Long</th>";
    table = table + "<th>RX Loc</th>";
    table = table + "<th>TX Sign</th>";
    table = table + "<th>TX Lat</th>";
    table = table + "<th>TX Long</th>";
    table = table + "<th>TX Loc</th>";
    table = table + "<th>Dist</th>";
    table = table + "<th>TX Azm</th>";
    table = table + "<th>RX Azm</th>";
    table = table + "<th>Freq</th>";
    table = table + "<th>Pwr</th>";
    table = table + "<th>SNR</th>";
    table = table + "<th>Drift</th>";
    table = table + "<th>Version</th>";
    table = table + "<th>Code</th>";
    table = table + "<th>Altitude</th>";
    table = table + "</tr>";
            
    /* Display the table data */
    for (var i = 0; i < wsprDataPoints; i++) {
        table = table + "<tr>";
        table = table + "<td>" + time[i] + "</td>";
        table = table + "<td>" + band[i] + "</td>";
        table = table + "<td>" + rx_sign[i] + "</td>";
        table = table + "<td>" + rx_lat[i] + "</td>";
        table = table + "<td>" + rx_lon[i] + "</td>";
        table = table + "<td>" + rx_loc[i] + "</td>";
        table = table + "<td>" + tx_sign[i] + "</td>";
        table = table + "<td>" + tx_lat[i] + "</td>";
        table = table + "<td>" + tx_lon[i] + "</td>";
        table = table + "<td>" + tx_loc[i] + "</td>";
        table = table + "<td>" + distance[i] + "</td>";
        table = table + "<td>" + tx_azimuth[i] + "</td>";
        table = table + "<td>" + rx_azimuth[i] + "</td>";
        table = table + "<td>" + frequency[i] + "</td>";
        table = table + "<td>" + power[i] + "</td>";
        table = table + "<td>" + snr[i] + "</td>";
        table = table + "<td>" + drift[i] + "</td>";
        table = table + "<td>" + version[i] + "</td>";
        table = table + "<td>" + code[i] + "</td>";
        table = table + "<td>" + altitude[i] + "</td>";
        table = table + "</tr>";
    }
    table = table + "</table>";
            
    /* Display Table Data */
    document.getElementById("data").innerHTML = table;
}


function showMap(showListeners) {
"use strict";
/*  showListeners - true - show listeners on map
    showListeners - false - do not show listeners on map
*/
    /* Reset the Map Container in case map as already displayed */
    document.getElementById('mapcontainer').innerHTML = "<div id='map'></div>";

    /* Create a map and set the center of the map to the first data point, probably the launch point */
    const map = L.map('map').setView([tx_lat[0], tx_lon[0]], 13);
    /* const map = L.map('map').fitWorld(); */

    /* Add streets and copyright */
	const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
    
    /* Marker is an array of pins on the map */
    var marker = [];

    /* Balloon track drops once each time a balloon is heard.  Only one pin is dropped even when there are multiple listeners */
    var current_time = "";

    /* Array of lat lon for each pin - used to draw polyline */
    var balloon_latlon = [];

    /* Arrays of listener callsigns - each time a pin is dropped, it is added to this array. 
    The array is check so that multiple pins for the same location are not dropped.*/
    var listeners = [];

    for (var i = 0; i < wsprDataPoints; i++) {
        
        /* Data is sorted by time */
        /* Only place a marker if we have encountered a new time */
        if (current_time != time[i]) {
            marker.push(L.marker([tx_lat[i], tx_lon[i]]).addTo(map).bindTooltip("Date:" + time[i] + ' - Altitude: ' + altitude[i]));
            current_time = time[i];

            /* add lat and lon to array for later polyline display */
            balloon_latlon.push([tx_lat[i], tx_lon[i]]);

            /* Display Listeners  */
            /* if the call sign exists in listeners then we have already dropped a pin for the listener */
            if (!listeners.includes(rx_sign[i])) {
            /*  Listeners not displayed - display it */
                if (showListeners) {
                    marker.push(L.marker([rx_lat[i], rx_lon[i]],{icon: RedPinIcon}).addTo(map).bindTooltip(rx_sign[i]));
                }
                //  Add the listerner to the list so we won't display it again
                listeners.push(rx_sign[i])
            }
        }
    }

    /* display lines connecting markers */
    var balloonpolyline = L.polyline(balloon_latlon, {color: 'red'}).addTo(map);

    /* zoom the map to the polyline */
    map.fitBounds(balloonpolyline.getBounds());

    wsprSpots = balloon_latlon.length;
    wsprListeners = listeners.length;

    /* if the user clicks on the map - display the lat/lon coordinates */
    var popup = L.popup();
    function onMapClick(e) {
	    popup
		    .setLatLng(e.latlng)
		    .setContent(`You clicked the map at ${e.latlng.toString()}`)
		    .openOn(map);
    }
    map.on('click', onMapClick);
    
}

function downloadCSVFile() {
"use strict";

    // define the heading for each row of the data
  
    var csv = "";
    csv = csv + "Date/Time,";
    csv = csv + "Band,";
    csv = csv + "RX Sign,";
    csv = csv + "RX Lat,";
    csv = csv + "RX Long,";
    csv = csv + "RX Loc,";
    csv = csv + "TX Sign,";
    csv = csv + "TX Lat,";
    csv = csv + "TX Long,";
    csv = csv + "TX Loc,";
    csv = csv + "Dist,";
    csv = csv + "TX Azm,";
    csv = csv + "RX Azm,";
    csv = csv + "Freq,";
    csv = csv + "Pwr,";
    csv = csv + "SNR,";
    csv = csv + "Drift,";
    csv = csv + "Version,";
    csv = csv + "Code,";
    csv = csv + "Altitude";
    csv = csv + "\n";
            
    /* Format the data as CSV */
    for (var i = 0; i < wsprDataPoints; i++) {
        csv = csv + time[i] + ",";
        csv = csv + band[i] + ",";
        csv = csv + rx_sign[i] + ",";
        csv = csv + rx_lat[i] + ",";
        csv = csv + rx_lon[i] + ",";
        csv = csv + rx_loc[i] + ",";
        csv = csv + tx_sign[i] + ",";
        csv = csv + tx_lat[i] + ",";
        csv = csv + tx_lon[i] + ",";
        csv = csv + tx_loc[i] + ",";
        csv = csv + distance[i] + ",";
        csv = csv + tx_azimuth[i] + ",";
        csv = csv + rx_azimuth[i] + ",";
        csv = csv + frequency[i] + ",";
        csv = csv + power[i] + ",";
        csv = csv + snr[i] + ",";
        csv = csv + drift[i] + ",";
        csv = csv + version[i] + ",";
        csv = csv + code[i] + ",";
        csv = csv + altitude[i] + "\n";
    }

    // Create an anchor that can be clicked for the download
    // https://www.javatpoint.com/oprweb/test.jsp?filename=javascript-create-and-download-csv-file1

    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    
    //provide the name for the CSV file to be downloaded
    hiddenElement.download = 'WSPRData.csv';
    hiddenElement.click();
}

function downloadJSONFile() {
    "use strict";

    var dq = '"';
    var eol = ",";
    var json = '[';
                
    /* Format the data as JSON */
    for (var i = 0; i < wsprDataPoints; i++) {
        json = json + '{';
        json = json + dq + "time" + dq + ":" + dq + time[i] + dq + eol;
        json = json + dq + "band" + dq + ":" + band[i] + eol;
        json = json + dq + "rx_sign" + dq + ":" + dq + rx_sign[i] + dq + eol;
        json = json + dq + "rx_lat" + dq + ":" + rx_lat[i] + eol;
        json = json + dq + "rx_lon" + dq + ":" + rx_lon[i] + eol;
        json = json + dq + "rx_loc" + dq + ":" + dq + rx_loc[i] + dq + eol;
        json = json + dq + "tx_sign" + dq + ":" + dq + tx_sign[i] + dq + eol;
        json = json + dq + "tx_lat" + dq + ":" + tx_lat[i] + eol;
        json = json + dq + "tx_lon" + dq + ":" + tx_lon[i] + eol;
        json = json + dq + "tx_loc" + dq + ":" + dq + tx_loc[i] + dq + eol;
        json = json + dq + "distance" + dq + ":" + distance[i] + eol;
        json = json + dq + "tx_azimuth" + dq + ":" + tx_azimuth[i] + eol;
        json = json + dq + "rx_azimuth" + dq + ":" + rx_azimuth[i] + eol;
        json = json + dq + "frequency" + dq + ":" + frequency[i] + eol;
        json = json + dq + "power" + dq + ":" + power[i] + eol;
        json = json + dq + "snr" + dq + ":" + snr[i] + eol;
        json = json + dq + "drift" + dq + ":" + drift[i] + eol;
        json = json + dq + "version" + dq + ":" + dq + version[i] + dq + eol;
        json = json + dq + "code" + dq + ":" + code[i] + eol;
        json = json + dq + "altitude" + dq + ":" + altitude[i];
        json = json + "},";
    }
    // remove extra comma
    json = json.substring(0, json.length - 1);
    json = json + "]";

    // Just a quick check to make sure that the file is in proper JSON format
    // var x = JSON.parse(json);

    // Create an anchor that can be clicked for the download
    // See https://www.javatpoint.com/oprweb/test.jsp?filename=javascript-create-and-download-csv-file1

    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:application/json;charset=utf-8,' + encodeURI(json);
    hiddenElement.target = '_blank';
    
    //provide the name for the json file to be downloaded
    hiddenElement.download = 'WSPRData.json';
    hiddenElement.click();
}

function ClearForm() {
    "use strict";
    document.getElementById("ReporterError").innerHTML = "";
    document.getElementById('mapcontainer').innerHTML = "<div id='map'></div>";
    document.getElementById("mapcontainer").style.display = "none";  
    document.getElementById("data").innerHTML = "";    
    document.getElementById("status").innerHTML = "";
    document.getElementById("rdShowMap").checked = true;    
}


// script.js
document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('nav a');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('href').substring(1);
            alert(`Navigating to ${target} section...`);
        });
    });
});

(function() {
    const { ipcRenderer } = require("electron");
    const GPSParser = new (require("./GPSParser"))();
    const QRCode = require("qrcode");
    const SaveSystem = new (require("./SaveSystem"))();

    //////////////////////////////////////////////////////////////////////////
    // Leaflet code
    //////////////////////////////////////////////////////////////////////////
    let BING_KEY =
        "At6YYQ1y86YztdKIh9jqtu4YnAxPXF5UkDssVDczmxerEtUM59lYVtOyWeCXzrWL";

    let mymap = L.map("map").setView([0, 0], 1);

    let bingLayer = L.tileLayer
        .bing({
            bingMapsKey: BING_KEY,
            imagerySet: "AerialWithLabels"
        })
        .addTo(mymap);

    let rocketMarker = null;

    function setRocketMarker(longitude, latitude) {
        if (rocketMarker == null) {
            rocketMarker = L.marker([latitude, longitude]).addTo(mymap);
        } else {
            rocketMarker.setLatLng(L.latLng(latitude, longitude));
        }
        return;
    }

    function setView(center, zoom) {
        mymap.flyTo(center, zoom, { duration: 2 });
    }

    //////////////////////////////////////////////////////////////////////////
    // XBee communication code
    //////////////////////////////////////////////////////////////////////////
    // let socket = io();
    let gps_info = null; //Current GPS information (longitude, latitude, etc.)
    let start_time = new Date() / 1000; //Start time of recording (in seconds since the epoch)
    let start_date = new Date(); //Datetime used for naming the output file
    let recorded_data = []; //List of GPS messages
    let recording = false; //True if recording is on. False if not recording.

    function appendMsg(cl, msg) {
        let MAX_LENGTH = 200;
        $("#messages").append($("<li>", { class: cl }).text(msg));
        if ($("#messages li").length > MAX_LENGTH) {
            $("#messages li")
                .first()
                .remove();
        }
    }

    function scrollToBottom() {
        $("#messages-container").animate(
            { scrollTop: $("#messages").prop("scrollHeight") },
            300
        );
    }

    function display_GPS_info(gin) {
        $("#gps-lat").text(gin.latitude.toFixed(6) + "°");
        $("#gps-lon").text(gin.longitude.toFixed(6) + "°");
        $("#gps-alt").text(gin.altitude.toFixed(3) + " m");
        $("#gps-time").text(gin.time + " (UTC)");
        $("#gps-sat").text(gin.satellites);
        $("#gps-prec").text(gin.precision);
    }

    function saveRecording() {
        //Save GPS data into CSV file
        SaveSystem.downloadCSV(
            "GPS Recording " + start_date.toUTCString() + ".csv",
            SaveSystem.convertDataToCSV(recorded_data)
        );

        //Save GPS data to KML file
        SaveSystem.downloadKML(
            "GPS Recording " + start_date.toUTCString() + ".kml",
            SaveSystem.convertDataToKML(recorded_data)
        );
    }

    ipcRenderer.on("xbee:receive", (e, data) => {
        console.log("Main window received ... " + data);

        GPSParser.bumble();
        let gpsDataObject = GPSParser.parse(data, start_time);

        if (gpsDataObject == null) {
            console.log("Failed to parse");
            return;
        }

        gps_info = gpsDataObject;

        display_GPS_info(gps_info); //Display GPS info in webpage
        setRocketMarker(
            gps_info.longitude,
            gps_info.latitude,
            gps_info.altitude
        ); //Update rocket position in 3D map

        //Save the GPS message in an array
        if (recording) {
            recorded_data.push(gps_info);
            console.log(gps_info.latitude);
            $("#gps-frames").text(recorded_data.length);
        }
    });

    $("form").submit(() => {
        let msg = $("#m").val();
        // socket.emit('XBeeWrite', msg);
        appendMsg("outgoingMsg", msg);
        $("#m").val("");
        scrollToBottom();
        return false;
    });

    $("#map-center-button").click(() => {
        if (gps_info != null) {
            setView(L.latLng(gps_info.latitude, gps_info.longitude), 15);
        } else {
            let lat = (Math.random() - 0.5) * 180;
            let lon = (Math.random() - 0.5) * 360;
            setView(L.latLng(lat, lon), 15);
        }
    });

    const copyToClipboard = str => {
        const el = document.createElement("textarea");
        el.value = str;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
    };

    $("#copy-button").click(() => {
        if (gps_info == null) {
            console.log("There is no data to copy.");
        } else {
            // Copy coordinates to clipboard
            copyToClipboard(gps_info.latitude + ", " + gps_info.longitude);

            // Generate QR code to Google Maps
            QRCode.toCanvas(
                document.getElementById("qr-code"),
                "https://www.google.com/maps/place/" +
                    gps_info.latitude +
                    "," +
                    gps_info.longitude,
                function(error) {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log("QR code success!");
                        document.getElementById("qr-code").style.maxWidth =
                            "200px";
                    }
                }
            );
        }
    });

    $("#record-button").click(() => {
        if (recording) {
            recording = false;
            $("#gps-frames-container").css("color", "#646464");
            $("#record-button").text("Record");
            if (recorded_data.length > 0) {
                saveRecording();
            } else {
                console.log("There is no recorded data. Not saving.");
            }
        } else {
            recording = true;
            recorded_data.length = 0;
            start_time = new Date() / 1000;
            $("#gps-frames").text(0);
            $("#gps-frames-container").css("color", "#42c2f4");
            $("#record-button").text("Stop Recording");
        }
    });
})();

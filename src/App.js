(function() {
    const { ipcRenderer } = require("electron");
    const GPSParser = require("./GPSParser");
    const QRCode = require("qrcode");

    //////////////////////////////////////////////////////////////////////////
    // Leaflet code
    //////////////////////////////////////////////////////////////////////////
    var BING_KEY =
        "At6YYQ1y86YztdKIh9jqtu4YnAxPXF5UkDssVDczmxerEtUM59lYVtOyWeCXzrWL";

    var mymap = L.map("leaflet-map").setView([0, 0], 1);

    var bingLayer = L.tileLayer
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

    // function create_GPS_info(tokens) {
    //     var gps_in = {
    //         latitude: parseFloat(tokens[1]),
    //         longitude: parseFloat(tokens[2]),
    //         altitude: parseFloat(tokens[3]),
    //         time: tokens[4],
    //         timer: new Date() / 1000 - start_time,
    //         satellites: parseFloat(tokens[5]),
    //         precision: parseFloat(tokens[6])
    //     };

    //     //Prevent further manipulation of gps information
    //     Object.freeze(gps_in);

    //     return gps_in;
    // }

    function display_GPS_info(gin) {
        $("#gps-lat").text(gin.latitude.toFixed(6) + "°");
        $("#gps-lon").text(gin.longitude.toFixed(6) + "°");
        $("#gps-alt").text(gin.altitude.toFixed(3) + " m");
        $("#gps-time").text(gin.time + " (UTC)");
        $("#gps-sat").text(gin.satellites);
        $("#gps-prec").text(gin.precision);
    }

    function downloadFile(filename, options, contents) {
        let element = document.createElement("a");
        element.setAttribute("href", options + encodeURIComponent(contents));
        element.setAttribute("download", filename);

        element.style.display = "none";
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    function downloadCSV(filename, text) {
        downloadFile(filename, "data:text/csv;charset=utf-8,", text);
    }

    function downloadKML(filename, text) {
        downloadFile(filename, "data:text/kml;charset=utf-8,", text);
    }

    function saveRecording() {
        //Define variables
        let outArr = [];
        let outArr2 = [];
        let outStr = "";
        let outStr2 = "";
        let inital_view = "";

        //Define constants
        const template_piece1 = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<Style id="yellowPoly">
<LineStyle>
<color>7f00ffff</color>
<width>4</width>
</LineStyle>
<PolyStyle>
<color>7f00ff00</color>
</PolyStyle>
</Style>
<Placemark><styleUrl>#yellowPoly</styleUrl>
<LookAt>`;

        const template_piece2 = `   <heading>-0.23</heading>
<tilt>47.81</tilt>
<range>300</range>
<gx:altitudeMode>relativeToSeaFloor</gx:altitudeMode>
</LookAt>
<LineString>
<extrude>1</extrude>
<tesselate>1</tesselate>
<altitudeMode>absolute</altitudeMode>
<coordinates>`;

        const template_piece3 = `</coordinates>
</LineString></Placemark>

</Document></kml>`;

        //Convert GPS messages into CSV file
        outArr.push(
            "Latitude,Longitude,Altitude,Time(GMT),Time(seconds since recording started),Satellites,Precision"
        );
        for (var i = 0; i < recorded_data.length; i++) {
            var gin = recorded_data[i];
            outArr.push(
                "" +
                    gin.latitude +
                    "," +
                    gin.longitude +
                    "," +
                    gin.altitude +
                    "," +
                    gin.time +
                    "," +
                    gin.timer +
                    "," +
                    gin.satellites +
                    "," +
                    gin.precision
            );
        }
        outStr = outArr.join("\n");
        downloadCSV(
            "GPS Recording " + start_date.toUTCString() + ".csv",
            outStr
        );

        //Convert GPS messages into KML file
        for (var i = 0; i < recorded_data.length; i++) {
            var gin = recorded_data[i];
            outArr2.push(
                "" + gin.longitude + "," + gin.latitude + "," + gin.altitude
            );
        }
        if (recorded_data.length > 0) {
            inital_view =
                "<longitude>" +
                recorded_data[0].longitude +
                "</longitude>" +
                "<latitude>" +
                recorded_data[0].latitude +
                "</latitude>" +
                "<altitude>" +
                recorded_data[0].altitude +
                "</altitude>";
        }
        outStr2 =
            template_piece1 +
            inital_view +
            template_piece2 +
            outArr2.join("\n") +
            template_piece3;
        downloadKML(
            "GPS Recording " + start_date.toUTCString() + ".kml",
            outStr2
        );
    }

    ipcRenderer.on("xbee:receive", (e, data) => {
        console.log("Main window received ... " + data);

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
        var msg = $("#m").val();
        // socket.emit('XBeeWrite', msg);
        appendMsg("outgoingMsg", msg);
        $("#m").val("");
        scrollToBottom();
        return false;
    });

    $("#map-center-button").click(() => {
        if (gps_info != null) {
            setView(L.latLng(gps_info.latitude, gps_info.longitude), 14);
        } else {
            let lat = (Math.random() - 0.5) * 180;
            let lon = (Math.random() - 0.5) * 360;
            setView(L.latLng(lat, lon), 14);
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
        if (gps_info != null) {
            console.log("Yea");

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
                    }
                    else {
                        console.log("QR code success!");
                        document.getElementById("qr-code").style.display = "block";
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
            saveRecording();
        } else {
            recording = true;
            recorded_data.length = 0;
            start_time = new Date() / 1000;
            $("#gps-frames").text(0);
            $("#gps-frames-container").css("color", "red");
            $("#record-button").text("Stop Recording");
        }
    });
})();

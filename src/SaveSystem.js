class SaveSystem {
    constructor() {
        this.downloadCSV.bind(this);
        this.downloadKML.bind(this);
        this.downloadFile.bind(this);
        this.convertDataToCSV.bind(this);
        this.convertDataToKML.bind(this);
    }

    downloadFile(filename, options, contents) {
        let element = document.createElement("a");
        element.setAttribute("href", options + encodeURIComponent(contents));
        element.setAttribute("download", filename);

        element.style.display = "none";
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    downloadCSV(filename, text) {
        this.downloadFile(filename, "data:text/csv;charset=utf-8,", text);
    }

    downloadKML(filename, text) {
        this.downloadFile(filename, "data:text/kml;charset=utf-8,", text);
    }

    convertDataToCSV(data) {
        let outArr = [];

        outArr.push(
            "Latitude,Longitude,Altitude,Time(GMT),Time(seconds since recording started),Satellites,Precision"
        );

        for (let msg of data) {
            outArr.push(
                [
                    msg.latitude,
                    msg.longitude,
                    msg.altitude,
                    msg.time,
                    msg.timer,
                    msg.satellites,
                    msg.precision
                ].join(",")
            );
        }

        return outArr.join("\n");
    }

    convertDataToKML(data) {
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

        let googleEarthCoord = function(lon, lat, alt) {
            return (
                "<longitude>" +
                lon +
                "</longitude>" +
                "<latitude>" +
                lat +
                "</latitude>" +
                "<altitude>" +
                alt +
                "</altitude>"
            );
        };

        let outArr = [];
        let inital_view = googleEarthCoord(0, 0, 0);

        //Convert GPS messages into KML file
        for (let msg of data) {
            outArr.push([msg.longitude, msg.latitude, msg.altitude].join(","));
        }

        if (data.length > 0) {
            inital_view = googleEarthCoord(
                data[0].longitude,
                data[0].latitude,
                data[0].altitude
            );
        }

        let outStr =
            template_piece1 +
            inital_view +
            template_piece2 +
            outArr.join("\n") +
            template_piece3;

        return outStr;
    }
}

module.exports = SaveSystem;

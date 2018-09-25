const GPSParser = {
    parse: function(data, start_time) {
        let tokens = data.split(" ");

        if (!(tokens.length >= 7 && tokens[0] == "GPS")) {
            return null;
        }

        //Check if the tokens are in the correct format
        for (let i = 0; i < 7; i++) {
            if (i != 4 && parseFloat(tokens[i]) == NaN) {
                console.log("Could not convert token");
                return null;
            }
        }

        var gpsDataObject = {
            latitude: parseFloat(tokens[1]),
            longitude: parseFloat(tokens[2]),
            altitude: parseFloat(tokens[3]),
            time: tokens[4],
            timer: new Date() / 1000 - start_time,
            satellites: parseFloat(tokens[5]),
            precision: parseFloat(tokens[6])
        };

        //Prevent further manipulation of gps information
        Object.freeze(gpsDataObject);

        return gpsDataObject;
    }
};

module.exports = GPSParser;

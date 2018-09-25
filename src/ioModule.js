const EventEmitter = require("events");
const path = require("path");
const SerialPort = require("serialport");

class ioModule extends EventEmitter {
    constructor() {
        super();
        this.port = null;
        this.parser = null;
        this.name = "ioModule";
    }

    setSerialPort(ioPath) {
        if (this.port && ioPath == this.port.path) {
            console.log("Already connected to", ioPath);
            return;
        }

        if (ioPath == "none") {
            console.log("Detected path 'none'");
            this.reset();
            return;
        }

        // Attempt to connect to device
        let port = new SerialPort(ioPath, { baudRate: 9600 }, error => {
            if (error) {
                console.log(error);
                this.reset();
            } else {
                console.log("Opening", ioPath);
                this.successfulConnection(port);
            }
        });
    }

    successfulConnection(port) {
        this.parser = port.pipe(
            new SerialPort.parsers.Delimiter({ delimiter: "\r" })
        );

        // If we were already connected to a device, close it
        if (this.port) {
            console.log("Closing ", this.port.path);
            if (this.port.isOpen) {
                this.port.close();
            }
        }

        // If device is not null, set it as this.device and add listeners
        if (port) {
            this.port = port;
            this.addDataListeners();
        }
    };

    reset() {
        console.log("Reseting ioModule...");
        if (this.port) {
            console.log("Closing ", this.port.path);
            if (this.port.isOpen) {
                this.port.close();
            }
            this.port = null;
        }
    }

    addDataListeners() {
        this.parser.on("data", (data) => this.handleIncomingData(data));
    }


    handleIncomingData(data) {
        this.emit("data", data);
    }

    write(data) {
        this.port.write(data);
    }
}

module.exports = ioModule;

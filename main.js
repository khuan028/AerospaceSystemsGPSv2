const electron = require("electron");
const url = require("url");
const path = require("path");
const SerialPort = require('serialport');
const ioModule = require("./src/ioModule");
const { app, BrowserWindow, Menu, MenuItem, ipcMain, protocol } = electron;

let mainWindow;
let ioSystem = new ioModule();

function establishHidConnection(ioPath) {
    ioSystem.setSerialPort(ioPath);
}

// Creates the main browser window
function createMainWindow() {
    // Create new window
    mainWindow = new BrowserWindow({width: 1280, height:720});

    // Load file://__dirname/mainWindow.html
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "src/index.html"),
            protocol: "file:",
            slashes: true
        })
    );

    // Build main menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemp);

    // Insert menu into window
    Menu.setApplicationMenu(mainMenu);

    // Add listeners
    addListeners();

    // Quit app when closed
    mainWindow.on("closed", () => {
        removeListeners();
        app.quit();
    });

    function addListeners() {
        ioSystem.on("data", data => {
            xbeeToPage(data);
        });
        ipcMain.on("xbee:send", pageToXbee);
        ipcMain.on("hid:request-all", handleHidRequestAll);
        ipcMain.on("hid:set", handleHidSet);
    }

    function removeListeners() {
        ioSystem.removeListener("data", xbeeToPage);
        ipcMain.removeListener("xbee:send", pageToXbee);
        ipcMain.removeListener("hid:request-all", handleHidRequestAll);
        ipcMain.removeListener("hid:set", handleHidSet);
    }

    function xbeeToPage(data) {
        let strdata = data.toString();
        console.log("Receiving ... " + strdata);
        mainWindow.webContents.send("xbee:receive", strdata);
    }

    function pageToXbee(data) {
        console.log("Sending ... " + data);
        ioSystem.write(data + "\n");
    }

    function handleHidRequestAll() {
        SerialPort.list((err, ports) => {
            let portNames = ports.map(p => p.comName);
            mainWindow.webContents.send("hid:serve-all", portNames);
        });
    }

    function handleHidSet(e, port) {
        establishHidConnection(port);
    }
}

// Main menu template
const mainMenuTemp = [
    {
        label: "File",
        submenu: [
            {
                label: "Quit",
                accelerator: "CmdOrCtrl+Q",
                click() {
                    app.quit();
                }
            }
        ]
    }
];

// If mac, adds a new empty menu item to the main menu
if (process.platform == "darwin") {
    mainMenuTemp.unshift({});
}

// Add developer tools if not in production
if (process.env.NODE_ENV !== "production") {
    mainMenuTemp.push({
        label: "Developer Tools",
        submenu: [
            {
                label: "Toggle DevTools",
                accelerator: "CmdOrCtrl+I",
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: "reload"
            }
        ]
    });
}

// Create the main window
app.on("ready", () => {
    // protocol.interceptFileProtocol('file', (request, callback) => {
    //     const url = request.url.substr(7)
    //     callback({ path: path.normalize(`${__dirname}/${url}`) })
    // }, (err) => {
    //     if (err) {
    //         console.error('Failed to register protocol');
    //     }
    // })
    createMainWindow();
});

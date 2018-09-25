(function() {
    const { ipcRenderer } = require("electron");

    let usbContainer = $('#usb-container');

    ipcRenderer.send('hid:request-all');

    // Should only be called once
    ipcRenderer.on('hid:serve-all', (e, devices) => {

        // TODO: Generate HTML select menu
        let usbMenu = $('<select>', { id:'usb-select-menu' })
        usbContainer.append(usbMenu);

        usbMenu.append($('<option>', { value: 'none', text: 'Select USB Device:'}));

        for(let d of devices) {
            let newOption = $('<option>', { value: d, text: d });
            usbMenu.append(newOption);
        }

        ipcRenderer.on('hid:add', (e, device) => {

        });

        ipcRenderer.on('hid:remove', (e, device) => {

        });

        console.log("yea");

        document.getElementById("usb-select-menu").addEventListener("change", () => {
            console.log("change called");
            console.log("Hello");
            let port = $("select option:selected").val();
            ipcRenderer.send("hid:set", port);
        });
    });
})();

'use strict';

const
    gp = require('node-gp'),
    smartcard = require('@paddek/smartcard'),
    Devices = smartcard.Devices,
    State = smartcard.State,
    reader = new Devices({
        isCardInserted: (c, {state: r}, {state: s}) => {
            return State.is(c, State.INUSE) && State.is(s, State.PRESENT) && State.is(r, State.INUSE, State.PRESENT);
        },
        isCardRemoved: (c, {state: r}, {state: s}) => {
            return State.is(c, State.EMPTY, State.PRESENT) && State.is(s, State.EMPTY) && State.is(r, State.PRESENT);
        }
    });

reader.on('device-activated', ({device, devices}) => {
    console.log(`Device '${device.getName()}' activated, devices: [${devices.toString()}]`);

    reader.close();

    device.on('card-inserted', async ({card}) => {
            const transceive = card.issueCommand.bind(card);
            const gpcard = new GlobalPlatform(transceive);

            console.log('card inserted', card.getAtr());

            try {
                await gpcard.connect();

                console.log('gp connected to card');

                const packages = await gpcard.getPackages();
                const applets = await gpcard.getApplets();

                applets.map(app => console.log('Applet AID', Buffer.from(app.aid).toString("hex")));
                packages.map(pkg => console.log('Package AID', Buffer.from(pkg.aid).toString("hex")));
            } catch (err) {
                console.error(err);
            }
    }).on('card-removed', ({card}) => {
        console.log('card removed', card.getAtr());
        device.close();
    }).on('error', console.error.bind(null, 'device error'));
}).on('device-deactivated', ({device, devices}) => {
    console.log(`Device '${device.getName()}' deactivated, devices: [${devices.toString()}]`);
}).on('error', console.error.bind(null, 'devices error'));
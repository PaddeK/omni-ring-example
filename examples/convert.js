'use strict';

const
    path = require('path'),
    CapFile = require('./../src/CapFile'),
    Converter = require('./../src/Converter');

(async () => {
    let apdus;
    const cap = new CapFile(path.join(__dirname, './../fixtures/MyApplet.cap'));

    console.log(`\n######################### Converting ${cap.getFile()} - seperated - #########################\n`);

    apdus = await Converter.installCapFile(cap, true);
    apdus.forEach(apdu => console.log(apdu.toString('hex')));

    console.log(`\n######################### Converting ${cap.getFile()} - combined - #########################\n`);

    apdus = await Converter.installCapFile(cap, false);
    apdus.forEach(apdu => console.log(apdu.toString('hex')));
})();
'use strict';

const Utils = require('./Utils');

class Apdu
{
    constructor (cla, ins, p1, p2, ...data)
    {
        this._buffer = Buffer.from([cla, ins, p1, p2]);

        const dataBuffer = Buffer.concat(data.map(Utils.toBuffer));

        this._buffer = Buffer.concat([this._buffer, dataBuffer.length, dataBuffer].map(Utils.toBuffer));
    }

    get bytes ()
    {
        return this._buffer;
    }
}

module.exports = Apdu;
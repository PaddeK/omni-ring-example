'use static';

class Utils
{
    /**
     * @param {*} value
     * @return {Buffer}
     */
    static toBuffer (value)
    {
        switch (true) {
            case Buffer.isBuffer(value):
                return value;
            case Utils.isHexString(value):
                return Buffer.from(value, 'hex');
            case Utils.isByte(value):
                return Buffer.from([value]);
            case Utils.isByteArray(value):
                return Buffer.from(value);
            case Utils.isBufferArray(value):
                return Buffer.concat(value);
            default:
                return Buffer.alloc(0);
        }
    }

    static toLvBuffer (value)
    {
        const buf = Utils.toBuffer(value);
        return Buffer.concat([Buffer.from([buf.length]), buf]);
    }

    /**
     * @param {*} value
     * @return {boolean}
     */
    static isByte (value)
    {
        return typeof value === 'number' && (value & 0xFF) === value;
    }

    /**
     * @param {*} value
     * @return {boolean}
     */
    static isByteArray (value)
    {
        return Array.isArray(value) && value.every(Utils.isByte);
    }

    /**
     * @param {*} value
     * @return {boolean}
     */
    static isBufferArray (value)
    {
        return Array.isArray(value) && value.every(Buffer.isBuffer);
    }

    /**
     * @param {*} value
     * @return {boolean}
     */
    static isHexString (value)
    {
        return typeof value === 'string' && /^(?:[a-f\d]{2})+$/i.test(value);
    }
}

module.exports = Utils;
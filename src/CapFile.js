'use strict';

const
    Components = [
        'Header', 'Directory', 'Import', 'Applet', 'Class', 'Method', 'StaticField', 'ConstantPool', 'RefLocation',
        'Export', 'Descriptor', 'Debug'
    ],
    EXT = '.cap',
    assert = require('assert'),
    fs = require('fs'),
    {basename} = require('path'),
    {F_OK, R_OK} = fs.constants,
    {readFile, access} = fs.promises,
    {loadAsync} = require('jszip');

class CapFile
{
    /**
     * @param {string} file
     */
    constructor (file)
    {
        this._file = file;
        this._cap = null;
        this._packageAID = Buffer.alloc(0);
        this._appletAID = Buffer.alloc(0);
        this._loaded = false;
    }

    /**
     * @return {string}
     */
    getFile ()
    {
        return this._file;
    }

    /**
     * @param {boolean} toHexString
     * @return {Buffer|string}
     */
    getAppletAID (toHexString = false)
    {
        assert(this._loaded, 'CapFile not loaded');
        return toHexString ? this._appletAID.toString('hex') : this._appletAID;
    }

    /**
     * @param {boolean} toHexString
     * @return {Buffer|string}
     */
    getPackageAID (toHexString = false)
    {
        assert(this._loaded, 'CapFile not loaded');
        return toHexString ? this._packageAID.toString('hex') : this._packageAID;
    }

    /**
     * @return {Promise}
     */
    async load ()
    {
        if (!this._loaded) {
            try {
                await access(this._file, F_OK | R_OK);

                const data = await loadAsync(readFile(this._file));
                const map = async (callback, prev, [path, file]) => callback(await prev, [basename(path, EXT), file]);

                this._cap = await Object.entries(data.files).reduce(map.bind(null, async (p, [name, file]) => {
                    return Components.includes(name) ? p.set(name, await file.async('nodebuffer')) : Promise.resolve(p);
                }), Promise.resolve(new Map()));

                const header = this._cap.get('Header');
                const applet = this._cap.get('Applet');

                this._packageAID = Buffer.from(header.slice(13, 13 + header[12]));
                this._appletAID = Buffer.from(applet.slice(5, 5 + applet[4]));
                this._loaded = true;
            } catch(err) {
                this._cap = null;
                this._packageAID = Buffer.alloc(0);
                this._appletAID = Buffer.alloc(0);
                this._loaded = false;
                console.error('Error: ', err);
            }
        }

        return this;
    }

    /**
     * @param {boolean} includeDebug
     * @return {string[]}
     * @private
     */
    _getComponentNames (includeDebug)
    {
        return includeDebug ? Components : Components.slice(0, -2);
    }

    /**
     * @param {boolean} includeDebug
     * @return {Buffer[]}
     * @private
     */
    _getComponents (includeDebug = false)
    {
        assert(this._loaded, 'CapFile not loaded');

        const components = this._getComponentNames(includeDebug);
        return components.reduce((prev, comp) => this._cap.has(comp) ? prev.concat(this._cap.get(comp)) : prev, []);
    }

    /**
     * @param {boolean} includeDebug
     * @return {number}
     */
    getCodeLength (includeDebug = false)
    {
        assert(this._loaded, 'CapFile not loaded');
        return this._getComponents(includeDebug).reduce((length, component) => length += component.length, 0);
    }

    /**
     * @param {boolean} includeDebug
     * @return {Buffer}
     * @private
     */
    _createHeader (includeDebug = false)
    {
        const len = this.getCodeLength(includeDebug);
        let bytes = [0xC4];

        if (len < 0x80) {
            bytes.push(len);
        } else if (len <= 0xFF) {
            bytes.push(0x81, len);
        } else if (len <= 0xFFFF) {
            bytes.push(0x82, (len & 0xFF00) >> 8, (len & 0xFF));
        } else {
            bytes.push(0x83, (len & 0xFF0000) >> 16, (len & 0xFF00) >> 8, (len & 0xFF));
        }

        return Buffer.from(bytes);
    }

    /**
     * @param {boolean} includeDebug
     * @return {Buffer}
     * @private
     */
    _getRawCode (includeDebug = false)
    {
        assert(this._loaded, 'CapFile not loaded');
        return Buffer.concat(this._getComponents(includeDebug));
    }

    /**
     * @param {Buffer} buffer
     * @param {number} size
     * @param {number} i
     * @return {Buffer[]}
     * @private
     */
    _chunkBuffer (buffer, size, i = 0)
    {
        assert(size > 0, 'Invalid chunkSize');

        const len = Math.ceil(buffer.length / size);
        return buffer.length <= size ? [buffer] : new Array(len).fill(0).map(() => buffer.slice(i, i += size));
    }

    /**
     * @param {boolean} includeDebug
     * @param {boolean} seperateComponents
     * @param {number} blockSize
     * @return {Buffer[]}
     */
    getLoadBlocks (includeDebug = false, seperateComponents = false, blockSize = 255)
    {
        assert(this._loaded, 'CapFile not loaded');

        if (!seperateComponents) {
            const data = Buffer.concat([this._createHeader(includeDebug), this._getRawCode(includeDebug)]);
            return this._chunkBuffer(data, blockSize);
        }

        return this._getComponentNames(includeDebug).reduce((blocks, name) => {
            if (!this._cap.has(name)) {
                return blocks;
            }

            let component = this._cap.get(name);
            component = name === 'Header' ? Buffer.concat([this._createHeader(includeDebug), component]) : component;

            return blocks.concat(this._chunkBuffer(component, blockSize))
        }, []);
    }
}

module.exports = CapFile;
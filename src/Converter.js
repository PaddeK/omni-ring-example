'use strict';

const
    CLA_GP = 0x80,
    INSTALL = 0xE6,
    LOAD = 0xE8,
    INSTALL_P1_LOAD = 0x02,
    INSTALL_P1_INSTALL = 0x04,
    INSTALL_P1_SELECTABLE = 0x08,
    INSTALL_P2 = 0x00,
    LOAD_P1_FINAL = 0x80,
    LOAD_P1 = 0x00,
    DEFAULT_INSTALL_PARAMS = [0xC9, 0x00],
    assert = require('assert'),
    Utils = require('./Utils'),
    CapFile = require('./CapFile'),
    Apdu = require('./Apdu');

class Converter
{
    /**
     * @param {CapFile} capFile
     * @param {boolean} includeDebug
     * @param {boolean} seperateComponents
     * @param {number} blockSize
     * @return {Promise<Buffer[]>}
     */
    static async loadCapFile (capFile, includeDebug = false, seperateComponents = false, blockSize = 255)
    {
        assert(capFile instanceof CapFile, 'Invalid param: capFile');
        assert(typeof includeDebug === 'boolean', 'Invalid param: includeDebug');
        assert(typeof seperateComponents === 'boolean', 'Invalid param: seperateComponents');
        assert(Utils.isByte(blockSize) && blockSize > 16 && blockSize <= 255, 'Invalid param: blockSize');

        const
            cap = await capFile.load(),
            aid = cap.getPackageAID(),
            blocks = cap.getLoadBlocks(includeDebug, seperateComponents, blockSize),
            loadP1 = i => (i === blocks.length - 1) ? LOAD_P1_FINAL : LOAD_P1,
            loadApdu = (block, index) => new Apdu(CLA_GP, LOAD, loadP1(index), index, block).bytes;

        // install for load
        let apdus = [new Apdu(CLA_GP, INSTALL, INSTALL_P1_LOAD, INSTALL_P2, aid.length, aid, '00000000').bytes];

        // loads
        return blocks.reduce((apdus, block, i) => apdus.concat(loadApdu(block, i)), apdus);
    }

    /**
     * @param {CapFile} capFile
     * @param {boolean} seperateComponents
     * @return {Promise<Buffer[]>}
     */
    static async installCapFile (capFile, seperateComponents)
    {
        const load = await Converter.loadCapFile(capFile, false, seperateComponents);
        const install = Converter.installAndMakeSelectable(capFile.getPackageAID(), capFile.getAppletAID());

        load.push(install);

        return load;
    }

    /**
     * @param {Buffer|string|Buffer[]|number[]} packageAid
     * @param {Buffer|string|Buffer[]|number[]} appletAid
     * @param {Buffer|string|Buffer[]|number[]} instanceAid
     * @param {Buffer|string|Buffer[]|number[]|number} privileges
     * @return {Buffer}
     */
    static installAndMakeSelectable (packageAid, appletAid, instanceAid = appletAid, privileges = 0)
    {
        const pAID = Utils.toBuffer(packageAid);
        const aAID = Utils.toBuffer(appletAid);
        const iAID = Utils.toBuffer(instanceAid);
        const priv = Utils.toBuffer(privileges);

        assert(pAID.length >= 5 && pAID.length <= 16);
        assert(aAID.length >= 5 && aAID.length <= 16);
        assert(iAID.length >= 5 && iAID.length <= 16);
        assert(priv.length === 1 || priv.length === 3);

        const data = [pAID, aAID, iAID, priv, DEFAULT_INSTALL_PARAMS, null].map(Utils.toLvBuffer);

        return new Apdu(CLA_GP, INSTALL, INSTALL_P1_INSTALL | INSTALL_P1_SELECTABLE, INSTALL_P2, data).bytes;
    }
}

module.exports = Converter;


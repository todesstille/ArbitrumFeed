const assert = require("assert");
const { RLP } = require("@ethereumjs/rlp");
const W3CWebSocket = require('websocket').w3cwebsocket;
const client = new W3CWebSocket('wss://arb1.arbitrum.io/feed:9642');

const enableLogs = true

function parseSigned(rlpData) {
    rlpData = rlpData.slice(1);
    if (rlpData[0] == 1) {
        rlpData = rlpData.slice(1);
        const decoded = RLP.decode(rlpData);
        parseType1TxData(decoded);
    } else if (rlpData[0] == 2) {
        rlpData = rlpData.slice(1);
        const decoded = RLP.decode(rlpData);
        parseSignedTxData(decoded);
    } else {
        const decoded = RLP.decode(rlpData);
        parseTxData(decoded);
    }

}

function parseType1TxData(data) {
    if (!enableLogs) {
        return;
    }
    data = data.map((x) => x.toString('hex'));
    console.log("Type 1 tx");
    console.log("ChainId", data[0]);
    console.log("Nonce", data[1]);
    console.log("GasPrice", data[2]);
    console.log("GasLimit", data[3]);
    console.log("To:", "0x" + data[4]);
    console.log("Value", data[5]);
    console.log("Data:", "0x" + data[6]);
    assert(data[7] == "");
    console.log("V:", data[8]);
    console.log("R:", data[9]);
    console.log("S:", data[10]);
}

function parseSignedTxData(data) {
    if (!enableLogs) {
        return;
    }
    console.log("Type 2 tx");
    data = data.map((x) => x.toString('hex'));
    console.log("ChainId:", parseInt(data[0], 16));
    console.log("Nonce:", parseInt(data[1], 16));
    console.log("GasPriorityFee:", parseInt(data[2], 16));
    console.log("GasMaxFee:", parseInt(data[3], 16));
    console.log("GasLimit:", data[4]);
    console.log("To:", "0x" + data[5]);
    console.log("Value:", data[6]);
    console.log("Data:", "0x" + data[7]);
    assert(data[8] == "");
    console.log("V:", data[9]);
    console.log("R:", data[10]);
    console.log("S:", data[11]);
}

function parseTxData(data) {
    if (!enableLogs) {
        return;
    }
    console.log("Legacy tx");
    data = data.map((x) => x.toString('hex'));
    console.log("Nonce:", parseInt(data[0], 16));
    console.log("GasPrice:", parseInt(data[1], 16));
    console.log("GasLimit:", parseInt(data[2], 16));
    console.log("To", "0x" + data[3]);
    console.log("Value", parseInt(data[4], 16));
    console.log("Data:", "0x" + data[5]);
    console.log("V:", data[6]);
    console.log("R:", data[7]);
    console.log("S:", data[8]);    
}

client.onerror = function() {
    console.log('Connection Error');
};

client.onopen = function() {
    console.log('WebSocket Client Connected');

    function sendNumber() {
        if (client.readyState === client.OPEN) {
            var number = Math.round(Math.random() * 0xFFFFFF);
            client.send(number.toString());
            setTimeout(sendNumber, 1000);
        }
    }
    sendNumber();
};

client.onclose = function() {
    console.log('echo-protocol Client Closed');
};

client.onmessage = function(e) {
    if (typeof e.data === 'string') {
        const obj = JSON.parse(e.data);
        assert(obj.messages.length == 1);
        // console.log("Sequence Number:", obj.messages[0].sequenceNumber);
        const message = obj.messages[0].message;
        const sig = obj.messages[0].signature;
        if (sig != undefined) {
            console.log("Sig:", sig)
        }
        const header = message.message.header;
        if (header.kind != 3) {
            // ToDO check L1 messages
            // console.log(message.message)
            let rlpData = Buffer.from(message.message.l2Msg, 'base64');            
        } else {
            // console.log(message.message.header);
            let rlpData = Buffer.from(message.message.l2Msg, 'base64');
            if (rlpData[0] == 3) {
                console.log("Batch send")
                // console.log(rlpData.toString('hex'))

                rlpData = rlpData.slice(1);

                while (rlpData.length > 0) {
                    let blockLength = rlpData.slice(0, 8).toString('hex');
                    blockLength = parseInt(blockLength, 16);
                    console.log("    Part of a batch")
                    let blockRlpData = rlpData.slice(8, 8 + blockLength);
                    rlpData = rlpData.slice(8 + blockLength);
                    if (blockRlpData[0] != 4) {
                        console.log("Unhandled part in batch transaction");
                        process.exit();
                    }
                    parseSigned(blockRlpData);
                }
            } else if (rlpData[0] == 4) {
                console.log("");
                console.log("Signed tx");
                parseSigned(rlpData);
            }
            // const decoded = RLP.decode(rlpData.buffer);
        }
    }
};

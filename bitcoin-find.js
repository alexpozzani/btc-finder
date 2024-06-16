import CoinKey from 'coinkey';
import walletsArray from './wallets.js';
import chalk from 'chalk'
import fs from 'fs';
const walletsSet = new Set(walletsArray);

function detectHexPatterns(hexString, reverse) {
    let threeRepeatsCount = 0;
    let lastThreeRepeatIndex = -1;
    let doubleThreeRepeated = false;
    let lastDoubleThreeRepeatIndex = -1;
    let hasSequencial = false;

    for (let i = 0; i < hexString.length - 2; i++) {
        if (hexString[i] === hexString[i + 1] && hexString[i] === hexString[i + 2] && hexString[i] === hexString[i + 3]) {
            //encontrar o último dígito repetido
            let j = i + 3;
            while (j < hexString.length && hexString[i] === hexString[j]) {
                j++;
            }

            const oldString = hexString.substring(i, j);
            let newValue = BigInt(`0x${oldString}`);

            //console.log(newValue.toString(16));
            if (reverse) {
                newValue--;
            } else {
                newValue++;
            }

            const max = '0x' + 'f'.repeat(oldString.length);

            if (newValue < 0 || newValue > BigInt(max)) {
                return hexString;
            }

            const newString = newValue.toString(16).padStart(oldString.length, '0');
            let newKey = BigInt(`0x${hexString.replace(oldString, newString)}`);

            if (reverse)
                newKey++;
            else
                newKey--;

            return newKey.toString(16);
        }
        else if (hexString[i] === hexString[i + 1] && hexString[i] === hexString[i + 2]) {
            threeRepeatsCount++;
            //i += 2; // Para pular para o próximo conjunto de caracteres após a sequência de 3 repetidos
            if (threeRepeatsCount >= 2) {
                lastThreeRepeatIndex = i;
            }
        }
        else if (hexString[i] === hexString[i + 1] && hexString[i + 2] === hexString[i + 3] && hexString[i + 4] === hexString[i + 5]) {
            doubleThreeRepeated = true;            
            lastDoubleThreeRepeatIndex = i;
        }
        else {
            const first = parseInt(hexString[i], 16);
            const second = parseInt(hexString[i + 1], 16);
            const third = parseInt(hexString[i + 2], 16);
            const fourth = parseInt(hexString[i + 3], 16);

            if (!hasSequencial &&
                ((
                    first + 1 === second && second + 1 === third && third + 1 === fourth) ||
                    first - 1 === second && second - 1 === third && third - 1 === fourth)
            ) {
                hasSequencial == true;
            }
        }
    }


    if (threeRepeatsCount >= 2 || hasSequencial || doubleThreeRepeated) {

        if (lastThreeRepeatIndex > 0 || lastDoubleThreeRepeatIndex > 0) {

            let repeatIndex = lastThreeRepeatIndex >= 0 ? lastThreeRepeatIndex : lastDoubleThreeRepeatIndex;
            let repeatSize = lastThreeRepeatIndex >= 0 ? 3 : 2;

            const oldString = hexString.substring(repeatIndex, repeatIndex + repeatSize);
            let newValue = BigInt(`0x${oldString}`);

            if (reverse) {
                newValue--;
            } else {
                newValue++;
            }

            const max = lastThreeRepeatIndex >= 0 ? 0xfff : 0xff;

            if (newValue < 0 || newValue > max) {
                return hexString;
            }

            let newKey = BigInt('0x' + hexString.substring(0, repeatIndex) + newValue.toString(16).padStart(oldString.length, '0') + hexString.substring(repeatIndex + repeatSize, hexString.length));

            if (reverse)
                newKey++;
            else
                newKey--;

            return newKey.toString(16);
        }

        return hexString;
    }
    return null;
}


export async function encontrarBitcoins(key, min, max, shouldStop) {

    let segundos = 0;
    let pkey = 0;
    let partialKey = 0;
    const um = BigInt(1);
    const startTime = Date.now()

    let zeroes = new Array(65).fill('');
    for (let i = 1; i < 60; i++) {
        zeroes[i] = 'C0DE' + '0'.repeat(60 - i);
    }

    console.log('Buscando Bitcoins...')

    const executeLoop = async () => {
        while (true) {

            key++;
            partialKey = key.toString(16)
            pkey = `${zeroes[partialKey.length]}${partialKey}`;


            if (Date.now() - startTime > segundos) {
                segundos += 1000
                console.log(segundos / 1000);
                if (segundos % 10000 == 0) {
                    const tempo = (Date.now() - startTime) / 1000;
                    console.clear();
                    console.log('Resumo: ')
                    console.log('Velocidade:', (Number(key) - Number(min)) / tempo, ' chaves por segundo')
                    console.log('Chaves buscadas: ', (key - min).toLocaleString('pt-BR'));
                    console.log('Ultima chave tentada: ', pkey)

                    const filePath = 'Ultima_chave.txt';  // File path to write to
                    const content = `Ultima chave tentada: ${pkey}`
                    try {
                        fs.writeFileSync(filePath, content, 'utf8');
                    } catch (err) {
                        console.error('Error writing to file:', err);
                    }
                }
            }

            const patternKey = detectHexPatterns(partialKey, false);
            if (patternKey != null) {
                // console.log('Padrão encontrado, chave antiga:', partialKey);
                // console.log('Padrão encontrado, nova chave  :', patternKey);
                key = BigInt(`0x${patternKey}`);
            } else {
                let publicKey = generatePublic(pkey)
                if (walletsSet.has(publicKey)) {
                    const tempo = (Date.now() - startTime) / 1000
                    console.log('Velocidade:', (Number(key) - Number(min)) / tempo, ' chaves por segundo')
                    console.log('Tempo:', tempo, ' segundos');
                    console.log('Private key:', chalk.green(pkey))
                    console.log('WIF:', chalk.green(generateWIF(pkey)))

                    const filePath = 'keys.txt';
                    const lineToAppend = `Private key: ${pkey}, WIF: ${generateWIF(pkey)}\n`;

                    try {
                        fs.appendFileSync(filePath, lineToAppend);
                        console.log('Chave escrita no arquivo com sucesso.');
                    } catch (err) {
                        console.error('Erro ao escrever chave em arquivo:', err);
                    }

                    throw 'ACHEI!!!! 🎉🎉🎉🎉🎉'
                }
            }

        }
        await new Promise(resolve => setImmediate(resolve));
    }
    await executeLoop();
}

export async function encontrarBitcoinsReverso(key, min, max, shouldStop, wallet) {
    console.log(wallet);
    let segundos = 0;
    let pkey = 0;
    let partialKey = 0;
    const um = BigInt(1);
    const startTime = Date.now()

    let zeroes = new Array(65).fill('');
    for (let i = 1; i < 60; i++) {
        zeroes[i] = 'C0DE' + '0'.repeat(60 - i);
    }

    console.log('Buscando Bitcoins...');

    key = max;

    const executeLoop = async () => {
        while (true) {

            key--;
            partialKey = key.toString(16);

            if (Date.now() - startTime > segundos) {
                segundos += 1000
                console.log(segundos / 1000);
                if (segundos % 10000 == 0) {
                    const tempo = (Date.now() - startTime) / 1000;
                    console.clear();
                    console.log('Resumo: ')
                    console.log('Velocidade:', (Number(max) - Number(key)) / tempo, ' chaves por segundo')
                    console.log('Chaves buscadas: ', (max - key).toLocaleString('pt-BR'));
                    console.log('Ultima chave tentada: ', partialKey)

                    const filePath = 'Ultima_chave.txt';  // File path to write to
                    const content = `Ultima chave tentada: ${partialKey}`
                    try {
                        fs.writeFileSync(filePath, content, 'utf8');
                    } catch (err) {
                        console.error('Error writing to file:', err);
                    }
                }
            }

            const patternKey = detectHexPatterns(partialKey, true);
            if (patternKey != null) {
                // console.log('Padrão encontrado, chave antiga:', partialKey);
                // console.log('Padrão encontrado, nova chave  :', patternKey);
                key = BigInt(`0x${patternKey}`);
            } else {
                pkey = `${zeroes[partialKey.length]}${partialKey}`;

                let publicKey = generatePublic(pkey)
                //console.log(pkey);
                //console.log(publicKey);
                //console.log(walletsArray[wallet]);
                if (walletsArray[wallet] === publicKey) {
                    const tempo = (Date.now() - startTime) / 1000
                    console.log('Velocidade:', (Number(max) - Number(key)) / tempo, ' chaves por segundo')
                    console.log('Tempo:', tempo, ' segundos');
                    console.log('Private key:', chalk.green(pkey))
                    console.log('WIF:', chalk.green(generateWIF(pkey)))

                    const filePath = 'keys.txt';
                    const lineToAppend = `Private key: ${pkey}, WIF: ${generateWIF(pkey)}\n`;

                    try {
                        fs.appendFileSync(filePath, lineToAppend);
                        console.log('Chave escrita no arquivo com sucesso.');
                    } catch (err) {
                        console.error('Erro ao escrever chave em arquivo:', err);
                    }

                    throw 'ACHEI!!!! 🎉🎉🎉🎉🎉'
                }
            }

        }
        await new Promise(resolve => setImmediate(resolve));
    }
    await executeLoop();
}

function generatePublic(privateKey) {
    let _key = new CoinKey(new Buffer(privateKey, 'hex'))
    _key.compressed = true
    return _key.publicAddress
}

function generateWIF(privateKey) {
    let _key = new CoinKey(new Buffer(privateKey, 'hex'))
    return _key.privateWif
}

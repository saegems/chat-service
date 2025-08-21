const CryptoJS = require("crypto-js");

const SECRET_KEY = process.env.SECRET_KEY;
const INIT_VECTOR = process.env.INIT_VECTOR;

function encrypt(text) {
    try {
        if (!SECRET_KEY || !INIT_VECTOR) {
            throw new Error("Secret key or init vector not initialized");
        }
        
        const iv = CryptoJS.enc.Utf8.parse(INIT_VECTOR);
        const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
        
        const encrypted = CryptoJS.AES.encrypt(
            text,
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        
        return encrypted.toString();
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error("Encryption error: " + error.message);
    }
}

function decrypt(encryptedText) {
    try {
        if (!SECRET_KEY || !INIT_VECTOR) {
            throw new Error("Secret key or init vector not initialized");
        }
        
        const iv = CryptoJS.enc.Utf8.parse(INIT_VECTOR);
        const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);
        
        const decrypted = CryptoJS.AES.decrypt(
            encryptedText,
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );
        
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error("Decryption error: " + error.message);
    }
}

module.exports = { encrypt, decrypt };

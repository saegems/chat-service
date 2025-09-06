const mysql = require("mysql2");

function connectToDatabase() {
    const db = mysql.createConnection({
        port: process.env.DB_PORT,
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: process.env.DATABASE
    });

    return new Promise((resolve, reject) => {
        db.connect((error) => {
            if(error) {
                console.error(`Error connecting to MySQL: ${error}`);
                reject(error);
                return;
            }
            else {
                console.log("Connected to MySQL database.");
                resolve(db);
            }
        });
    });
}

module.exports = connectToDatabase;

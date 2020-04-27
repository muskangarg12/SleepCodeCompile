const mongoose = require("mongoose");

mongoose
    .connect(`mongodb://${process.env.DB_USER}:${process.env.DB_PW}@ds119996.mlab.com:19996/sleepcodecompile`)
    .then(() => {
        console.log("Database Ready for use!");
    })
    .catch(err => {
        console.error("Error connecting to Database!!");
        console.error(err.stack);
        process.exit(1);
    });

module.exports = mongoose;
const express = require("express");
const bodyParser = require("body-parser");

module.exports = function () {
    // Create an instance of the Express application
    const app = express();

    // Middleware to parse JSON request bodies
    app.use(bodyParser.json());

    // Define a route handler for the root route
    app.get("/", (req, res) => {
        res.send("Hello, Express!");
    });

    // Start the server and listen on a specific port
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
};

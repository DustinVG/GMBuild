const express = require('express');
const app = express();
var opn = require('opn');

const argv = require('minimist')(process.argv.slice(2));
console.log(argv.folder);

app.use(express.static(argv.folder)); //Serves resources from public folder

var server = app.listen(51268);

console.log(`Server started on port 51268 is serving the path ${argv.folder}`);

opn("http://127.0.0.1:51268/index.html");
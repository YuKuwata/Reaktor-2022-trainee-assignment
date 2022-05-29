const { application } = require('express');
const express = require('express');
const app = express();
const affair = require('./affair')
app.use(express.static('public'))

app.get('/',affair.renderList);

app.get('/detail/:packageName',affair.renderDetail);


app.engine('html',require('express-art-template'));

app.listen(3000,() => {
    console.log('Listening on Port 3000.');
})
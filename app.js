let express = require('express');
let app = express();
let apiController = require('./controllers/apiController');

let port = process.env.PORT || 3000;

app.use('/', express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

apiController(app);

app.listen(port);
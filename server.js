var
  express = require("express"),
  path = require("path"),
  nedb = require('nedb'),
  tmdb = require('tmdbv3').init("bce753a11c69e6ae5ec03c4ab2ea1484"),
  request = require('request'),
  terminal = require("child_process").exec,
  databaseUrl = "db/items.db";

var db = {
  items: new nedb({ filename: databaseUrl, autoload: true })
};

var app = express();

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.use(express.logger('dev'));
  app.use(express.bodyParser()),
  app.use(express.static(path.join(__dirname, 'public')));
});


app.get('/status', function(req, res){
  var response = {
    guessit: false,
    ffmpeg: false
  };

  var guessit = terminal('/usr/local/bin/guessit', function(error, stdout, stderr){
    if(error && error.code == 127){
      console.log(error);
      console.log(stderr);
    } else {
      response.guessit = true;
    }
    var ffmpeg = terminal('/usr/local/bin/ffmpeg', function(e, out, err){
      if(e && e.code == 127){
        console.log(e);
        console.log(err);
        res.json(200, response);
      } else {
        response.ffmpeg = true;
        res.json(200, response);
      }
    });
  });
});

app.get('/tmdb', function(req, res){
  var response = {};
  tmdb.configuration(function(err, r){
    if(err){
      console.log(err);
    } else {
      response.conf = r;
      response.status = "running";
      res.json(response);
    }
      
  });
});

app.get('/movie/:id', function(req, res){
  var id = req.params.id;
  tmdb.movie.info(id, function(err, r){
    res.json(200, r);
  });
});

app.post('/guess', function(req, res){
  var file = req.body.name;
  console.log(req.body);
  var process = terminal('/usr/local/bin/guessit "'+file+'" -a', function(error, stdout, stderr){
        if (error) {
          console.log(error.stack);
        }
        var json = stdout.split("GuessIt found: ")[1];
        var json = JSON.parse(json);
        var type = json.type.value;

        if(type == "episode"){

        } else {
          tmdb.search.movie(json.title.value, 1, function(err, r){
            res.json(200, r.results);
          });
        }
        
      });
});


app.get('/api', function (req, res) {
  res.send('API is running');
});

app.get('/items', function (req, res) {
  db.items.find({}, function(err, result) {
    res.send(result);
  });
});

app.post('/items', function (req, res) {
  var item = req.body;
  db.items.insert(item, function (err, result) {
    if (err) {
      res.send({'error':'An error has occurred'});
    } else {
      console.log('Success: ' + JSON.stringify(result));
      res.send(result);
    }
  });
});

app.delete('/items/:id', function (req, res) {
  var id = req.params.id;
  db.items.remove({_id: id}, {}, function (err, result) {
    if (err) {
      res.send({'error':'An error has occurred - ' + err});
    } else {
      console.log('' + result + ' document(s) deleted');
      res.send(req.body);
    }
  });
});

app.listen(app.get('port'));
console.log('Server listening on port ' + app.get('port'));
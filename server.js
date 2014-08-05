var
  express = require("express"),
  path = require("path"),
  nedb = require('nedb'),
  tmdb = require('tmdbv3').init("bce753a11c69e6ae5ec03c4ab2ea1484"),
  request = require('request'),
  fs = require('fs'),
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

app.get('/show/:id', function(req, res){
  var id = req.params.id;
  tmdb.show.info(id, function(err, r){
    res.json(200, r);
  });
});
app.get('/show/:id/cast', function(req, res){
  var id = req.params.id;
  tmdb.show.cast(id, function(err, r){
    res.json(200, r);
  });
});

app.get('/movie/:id/cast', function(req, res){
  var id = req.params.id;
  tmdb.movie.casts(id, function(err, r){
    res.json(200, r);
  });
});

app.post('/publish', function(req, res){
  var item = req.body,
      r = request.post("http://cultcut-env.elasticbeanstalk.com/api/angular/?method=cutmaker_publish", function(err, response, body){
        if(err){
          // console.log("Failed: ", err);
          res.json(200, {status: err});
        } else {
          console.log("Success !", body);
          res.json(200, {res: JSON.parse(body)});
        } 
      });
  var file = fs.createReadStream(item.file);
  console.log(file);
  var form = r.form();
  form.append('title', item.title);
  form.append('quote', item.quote);
  form.append('type', item.type);
  form.append('episode', item.episode);
  form.append('season', item.season);
  form.append('lang', item.lang);
  form.append('context', JSON.stringify(item.context));
  form.append('person', JSON.stringify(item.person));
  form.append('tags', item.tags);
  form.append('video_file', file);
});

app.post('/encode', function(req, res){
  var duration = req.body.end - req.body.start;
  var ffmpegStr = "-i '"+req.body.source+"' -s 640x360 -c:v libx264 -c:a aac -ac 2 -b:a 255k -ar 48000 -async 1 -strict -2 -y -ss "+req.body.start+" -t "+duration+" '"+req.body.target+"/"+req.body.filename+".mp4'";
  console.log(ffmpegStr);
  var ffmpeg = terminal('/usr/local/bin/ffmpeg '+ffmpegStr, function(e, out, err){
      if(e && e.code == 127){
        console.log(e);
        console.log(err);
        res.json(200, {status: "error", message: "FFMPEG is not installed"});
      } else {
        console.log(e);
        console.log(out);
        console.log(err);
        var response = {
          status: "success",
          path: req.body.target+"/"+req.body.filename+".mp4"
        }
        res.json(200, response);
      }
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
          tmdb.search.tv(json.series.value, 1, function(err, r){
            res.json(200, {type: "tv", results: r.results, guessed: json});
          });
        } else {
          tmdb.search.movie(json.title.value, 1, function(err, r){
            res.json(200, {type: "movie", results: r.results, guessed: json});
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
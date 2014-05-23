var body, player, file, tmdb, movie, conf, records, curRecord, tempRecord, timer, cutTimeout;

function tmdbImg(type, size, path){
	return tmdb.images.base_url + tmdb.images[type+"_sizes"][size] + path;
}

function startTimer(){
	var cnt = 14;
	timer = setInterval(function(){
		cnt--;
		$("#timer").text(cnt);
		if(cnt == 0){
			endRecord();
			clearInterval(timer);
		} 
	}, 1000);
}

function stopTimer(){
	if ( timer ) clearInterval(timer);
}

function resetTimer(){
	if ( timer ) clearInterval(timer);
	$('#timer').text(14);
}

function startRecord(){
	console.log("Start recording");
	curRecord.start = player.currentTime();
	$('#recording').show();
	startTimer();
}

function endRecord(){
	console.log("End recording");
	curRecord.end = player.currentTime();
	stopTimer();
	records.push(curRecord);
	console.log(records);
	$.totalStorage('records_'+movie.id, records);
	curRecord = {
		title: "Cut "+records.length,
		start: undefined,
		end: undefined
	};
	$('#status').css('color', 'green');
	$('#timer').text("Your cut has been saved !");
	setTimeout( function(){
		$('#recording').fadeOut(1000, function(){
			$('#status').css('color', 'red');
			$('#timer').text("14");
		});
	}, 5000);
}

function drawRecords(){
	var 
		records = $.totalStorage('records_'+movie.id) || [],
		html = '';

	$('#records-list').empty();

	for(i=0;i<records.length;i++){
		tmp = '<li><a href="#" class="tocut" data-start="{{start}}" data-end="{{end}}">Cut n°'+i+'</a></li>';
		html += Mustache.render(tmp, records[i]);
	}
	console.log(html);
	$('#records-list').append(html);
	return false;
}

function playMovie(id, backdrop){
	Mousetrap.bind("i", startRecord);
	Mousetrap.bind("o", endRecord);
	$('body, #infos').css({"background-image": "url(" + tmdbImg( 'backdrop', 3, backdrop ) + ")"});
	$("#first-step").fadeOut(300, function(){
		$.get('/movie/'+id, function(r){
			movie = r;
			records = $.totalStorage('records_'+r.id) || [];
			// Instanciate blank record ready for use
			curRecord = {
				title = "Cut "+
				start: undefined,
				end: undefined
			};
			var fileURL = window.URL.createObjectURL(file);
			  $('#video').attr('src', fileURL);
			  player = videojs('player', {
			  	controls: true,
			  	autoplay: true
			  }, function(){
			  	$('#player-wrap').fadeIn(500);
			  }).src(fileURL);
		});
	});
}

function openInfos(event, callback){
	drawRecords();
	$(this).addClass('opened');
	$('#player-wrap').addClass('aside');
	setTimeout(function(){
		$('#infos').find('.row-fluid').fadeIn(300);
	}, 500);
	return false;
}

function closeInfos(event, callback){
	$(this).removeClass('opened');
	$('#player-wrap').removeClass('aside');
	$('#infos').find('.row-fluid').fadeOut(500, callback);
}

function goToCut(){
	clearTimeout(cutTimeout);
	var data = $(this).data();
	console.log(data);
	closeInfos(undefined, function(){
		player.currentTime(data.start).play();
		var inter = parseInt( (data.end - data.start) * 1000); 
		cutTimeout = setTimeout(function(){
			player.pause();
		}, inter);
	});
	return false;
}

function guess(){
	$('#file').fadeOut(300);
	file=document.getElementById('file').files[0];
	console.log(file.name);
	$.post('/guess', {name: file.name}, function(r){
		console.log(r);
		var item;
		var html = '<div class="alert alert-info">We have found those movies. Which one do you wish to Cut ?</div>';
		html += "<ul class='choose-list'>";
		for(i in r){
			item = r[i];
			html += '<li>';
			html += '<a href="#" class="play-movie" data-id="'+item.id+'" data-backdrop="'+item.backdrop_path+'">';
			html += '<img src="'+tmdbImg('poster', 2, item.poster_path)+'">';
			html += '</a>';
			html += '</li>';
		}
		html += "</ul>";
		$('#first-step').append(html);
	});
}

$(document).ready(function(){


	// get TMDB config
	$.get('/tmdb', function(r){
		if(r.status == "running"){
			tmdb = r.conf;
		}
	});


	body = $('body');

	// Random backdrop at first
	$.getJSON('http://dev.cultcut.com/facelift/wp/api/cuts/?method=random_bd&callback=?', function(json){
		$('body, #infos').css({"background-image": "url("+json.bd+")"});
	});

	// Guess what movie it is
	$('#file').on('change', guess);

	// Change backdrop on hover
	body.on('mouseenter', '.play-movie', function(){
		var backdrop = $(this).data('backdrop');
		if(backdrop){
			body.css({"background-image": "url("+tmdbImg('backdrop', 1, backdrop)+")"});	
		} else {
			body.css({"background-image": "none"});
		}
	});

	// click on the poster
	body.on('click', '.play-movie', function(){
		var data = $(this).data();
		playMovie(data.id, data.backdrop);
		return false;
	});	

	//events in movie mode
	$('#refresh-records').click(drawRecords);
	body.on('click', '.open-infos', openInfos);
	body.on('click', '.open-infos.opened', closeInfos);
	body.on('click', '.tocut', goToCut);
	

});
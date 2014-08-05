var body,
	player, 
	file,
	fileURL, 
	tmdb, 
	movie, 
	conf, 
	records, 
	curRecord, 
	tempRecord, 
	timer, 
	cutTimeout, 
	currIndex, 
	adminUser, 
	videoPath, 
	guessitStatus, 
	ffmpegStatus,
	episode,
	recordsName,
	endpoint,
	smallPlayer,
	mediaType,
	mouseTimeOut,
	blockTimeOut;


var nw = require('nw.gui');
var	gui = nw.Window.get();

var menu = new nw.Menu({type: 'menubar'});

//console.log(gui.menu);


menu.append(new nw.MenuItem({label: 'Settings', click: function(){console.log("settings");}}));
menu.append(new nw.MenuItem({label: 'Plop', click: function(){console.log("plop");}}));
gui.menu = menu;
//nwMenu.append(new nw.menuItem({'label': 'Settings'}));

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

function showInspector(){
	gui.showDevTools();
}

function enterFullScreen(){
	$('#window-bar').fadeOut(200);
	$('#main').css('paddingTop', 0);
	gui.enterFullscreen();
}

function leaveFullScreen(){
	$('#window-bar').fadeIn(200);
	$('#main').css('paddingTop', 40);
	gui.leaveFullscreen();
}

function stopTimer(){
	if ( timer ) clearInterval(timer);
}

function resetTimer(){
	if ( timer ) clearInterval(timer);
	$('#timer').text(14);
}

function updateDuration(){
	if(!curRecord && !curRecord.start) return false;
	var duration = (player.currentTime() - curRecord.start);
	if(duration > 14 || duration <= 0){
		$('#duration').addClass("text-danger").removeClass("text-success");
	} else {
		$('#duration').removeClass("text-danger").addClass("text-success");
	}
	var fix = duration.toFixed(2);
	$('#duration').text(fix);
	return duration;
}

function startRecord(){
	console.log("Start recording");
	curRecord.start = player.currentTime();
	$('#start_time').text(curRecord.start);
	$('#recording').show();
	//startTimer();
	if(player.paused()) player.play();
}

function endRecord(){
	if(!curRecord.start) return false;
	if(updateDuration() > 14) return alert("You cannot end your Cut here, it is longer than 14s...");
	console.log("End recording");
	curRecord.end = player.currentTime();
	stopTimer();
	records.push(curRecord);
	console.log(records);
	$.totalStorage(recordsName, records);
	curRecord = {
		title: (movie.original_title || movie.original_name)+" - Cut " + ( records.length + 1 ),
		start: undefined,
		end: undefined,
		status: "draft"
	};
	// $('#status').css('color', 'green');
	// $('#timer').text("Your cut has been saved !");
	setTimeout( function(){
		$('#recording').fadeOut(1000, function(){
			// $('#status').css('color', 'red');
			// $('#timer').text("14");
		});
	}, 300);
}

function drawRecords(){
	var 
		records = $.totalStorage(recordsName) || [],
		html = '';

	$('#records-list').empty();

	for(i=0;i<records.length;i++){
		var color = (records[i].file) ? 'blue' : 'yellow';
		if(records[i].published) color = "green";
		tmp = '<li class="s-{{status}}"><a href="#" class="tocut" data-start="{{start}}" data-index="'+i+'" data-end="{{end}}">{{title}}';
		tmp += '<span class="time">From '+secToTime(records[i].start)+' to '+secToTime(records[i].end)+'</span>';
		tmp += '</a><i class="fa fa-circle status-light" style="color: '+color+';"></i>';
		tmp += '<ul class="actions">';
		tmp += '<li><a data-placement="top" title="Edit title" class="tipped action-edit-title" data-index="'+i+'" href="#"><i class="fa fa-edit"></i></a></li>';
		tmp += '<li><a data-placement="top" title="Delete" class="tipped action-delete" data-index="'+i+'" href="#"><i class="fa fa-times"></i></a></li>';
		tmp += '<li><a data-placement="top" title="Publish" class="tipped action-publish" data-index="'+i+'" href="#"><i class="fa fa-cloud-upload"></i></a></li>'
		tmp += '<li><a data-placement="top" title="Encode video" data-file="{{file}}" class="tipped action-encode" data-index="'+i+'" href="#"><i class="fa fa-file-movie-o"></i></a></li>'
		tmp += '</ul></li>';
		html += Mustache.render(tmp, records[i]);
	}
	if(records.length <= 0) html = '<li class="msg">You haven\'t recorded any Cuts for this movie yet</li>';
	$('#records-list').append(html);
	$('.tipped').tooltip();
}

function drawSmallPlayer(file){
	if(smallPlayer){
		smallPlayer.src('file://'+file);
	} else {
		smallPlayer = videojs('small-player', {
			  	controls: true,
			  	autoplay: true,
			  	width: 538,
			  	height: 300
			  }, function(){
			  	
			  }).src('file://'+file);
	}
	
}

function publishCut(){
	$(this).button('loading');
	var newCut = {};
	$('#publish-form').find('.model').each(function(){
		newCut[$(this).data('prop')] = $(this).val();
	});
	newCut.person = records[currIndex].actor;
	newCut.context = movie;
	if(episode){
		newCut.episode = episode.episode;
		newCut.season = episode.season;	
	}
	newCut.type = mediaType;
	$.post('/publish', newCut, function(r){
		console.log(r);
		$(this).button('reset');
		if(r.res.status == "success"){
			alert("Your cut has been successfully published, it is now awaiting moderation.");
			records[currIndex].published = true;
			records[currIndex].remote_id = r.res.id;
			records[currIndex].status = "published";
			$('#publish-modal').modal('hide');
		} else {
			console.log("ERROR");
			alert(r.res.message);
		}
	}.bind(this));
	return false;
}

function seekBack(){
	var much = $(this).data('time') || 5;
	var now = player.currentTime();
	var then = now - much;
	return player.currentTime(then);
}

function frameForward(){
	// TODO
	var now = player.currentTime();
	var much = 0.2;
	var then = now + much;
	return player.currentTime(then);
}


function frameBackward(){
	// TODO
	var now = player.currentTime();
	var much = 0.2;
	var then = now - much;
	return player.currentTime(then);
}
function oneForward(){
	// TODO
	var now = player.currentTime();
	var much = 0.04;
	var then = now + much;
	return player.currentTime(then);
}


function oneBackward(){
	// TODO
	var now = player.currentTime();
	var much = 0.04;
	var then = now - much;
	return player.currentTime(then);
}

function playMovie(id, backdrop, type){
	Mousetrap.bind("i", startRecord);
	Mousetrap.bind("o", endRecord);
	Mousetrap.bind("esc", leaveFullScreen);
	Mousetrap.bind(["ctrl+f", "command+f"], enterFullScreen);
	endpoint = (type == 'movie') ? '/movie/'+id : '/show/'+id;
	mediaType = type;
	
	$("#first-step").fadeOut(300, function(){
		$.get(endpoint, function(r){
			movie = r;
			$('body, #infos').css({"background-image": "url(" + tmdbImg( 'backdrop', 3, r.backdrop_path ) + ")"});
			console.log(r);
			recordsName = (type == 'movie') ? 'records_'+r.id : 'records_'+r.id+'_'+episode.season+'_'+episode.episode;
			records = $.totalStorage(recordsName) || [];
			// Instanciate blank record ready for use
			curRecord = {
				title: (movie.original_title || movie.original_name)+" - Cut " + ( records.length + 1 ),
				start: undefined,
				end: undefined,
				status: "draft"
			};
			if(type == "tv") curRecord.episode = episode;
			fileURL = window.URL.createObjectURL(file);
			  $('#video').attr('src', fileURL);
			  player = videojs('player', {
			  	controls: true,
			  	autoplay: true
			  }, function(){
			  	$('#player-wrap').fadeIn(500);
			  	Mousetrap.bind("space", function(){
			  		return (player.paused()) ? player.play() : player.pause();
			  	});
			  	$('#player').find('.vjs-control-bar').addClass('will-hide');
			  }).src(fileURL);
			  player.on('play', function(){
			  		closeInfos();
			  });
			  player.on('timeupdate', function(e){
			  	if(curRecord && curRecord.start) updateDuration();
			  });
			  Mousetrap.bind("right", frameForward);
			  Mousetrap.bind("left", frameBackward);
			  Mousetrap.bind(["command+right", "ctrl+right"], oneForward);
			  Mousetrap.bind(["command+left", "ctrl+left"], oneBackward);
		});
	});
}

function setTitle(index, title){
	console.log("setting title for");
	var rec = records.slice(index, index+1)[0];
	console.log(rec);
	rec.title = title;
	console.log("as "+title);
	records[index] = rec;
	$.totalStorage(recordsName, records); 
}

function to2(number) {
     return (number < 10 ? '0' : '') + number;
}

function secToTime(val){
	var minutes = to2(parseInt(val/60));
	var seconds = to2(parseInt((val%60)));
	return ''+minutes+':'+seconds;
}

function openTitleModal(e){
	var data = $(this).data();
	currIndex = data.index;
	$('#title-modal').modal({
		show: true,
		backdrop: true
	});

	
	console.log("Modal shown");
	$('#new-title').val(records[currIndex].title);
	if($('#current-index').length > 0){
		$('#current-index').val(currIndex);
	} else {
		$('#set-title').append('<input id="current-index" type="hidden" value="'+currIndex+'" name="currindex" />');
	}		

	$('#title-modal').on('hide.bs.modal', drawRecords);
	return false;
}

function submitTitle(e){
	e.preventDefault();
	var index = $('#current-index').val(),
		title = $('#new-title').val();
	setTitle(index, title);
	$('#title-modal').modal('hide');
	return false;
}

function openInfos(event, callback){
	player.pause();
	drawRecords();
	$(this).addClass('opened');
	$('#player-wrap').addClass('aside');
	setTimeout(function(){
		$('#infos').find('.row-fluid').fadeIn(300);
	}, 500);
	return false;
}

function closeInfos(event, callback){
	$("#nav").find('.open-infos').removeClass('opened');
	$('#player-wrap').removeClass('aside');
	$('#infos').find('.row-fluid').fadeOut(500, callback);
}

function deleteItem(e){
	e.preventDefault();
	var data = $(this).data(),
		index = data.index;
	if(confirm("Are you sure you want to delete "+ records[index].title+" ?")){
		records.splice(index, 1);
		$.totalStorage(recordsName, records);
		$(this).parent().parent().parent().slideUp(200, drawRecords);
	}
}

function goToCut(){
	clearTimeout(cutTimeout);
	var data = $(this).data();
	console.log(data);
	closeInfos(undefined, function(){
		$("#nav").find('.open-infos').removeClass('opened');
		player.currentTime(data.start).play();
		var inter = parseInt( (data.end - data.start) * 1000); 
		cutTimeout = setTimeout(function(){
			player.pause();
		}, inter);
	});
	return false;
}

function guess(){
	$('#choose-file').fadeOut(300);
	file=document.getElementById('file').files[0];
	console.log(file.name);
	$.post('/guess', {name: file.name}, function(r){
		console.log(r);
		var item;
		var scope = (r.type == "tv") ? "TV Shows" : "movies";
		if(r.type == "tv"){
			if(r.guessed.episodeNumber && r.guessed.season){
				episode = {
					season: r.guessed.season.value,
					episode: r.guessed.episodeNumber.value,
					raw: r.guessed.episodeNumber.raw
				};
			}
		}
		var html = '<div class="alert alert-info">We have found those '+scope+'. Which one do you wish to Cut ?</div>';
		html += "<ul class='choose-list'>";
		for(i in r.results){
			item = r.results[i];
			html += '<li>';
			html += '<a href="#" class="play-movie" data-type="'+r.type+'" data-id="'+item.id+'" data-backdrop="'+item.backdrop_path+'">';
			html += '<img src="'+tmdbImg('poster', 2, item.poster_path)+'">';
			html += '</a>';
			html += '</li>';
		}
		html += "</ul>";
		$('#first-step').append(html);
		$('#specify').fadeIn();
	});
}

function setUploadPath(e){
	e.preventDefault();
	console.log($(this).val());
	videoPath = $(this).val();
	$('#upload-path').val(videoPath);
	$.totalStorage('video_path', $(this).val());
}

function saveSettings(login, pwd, path){
	var loginLog = $('#login-status'),
		btn = $('#save-settings');

	btn.button('loading');
	if(login != "" && pwd != ""){
		loginLog.html('<p class="text-info">Connecting...</p>').show();
		// We are trying to set up the user
		$.post('http://dev.cultcut.com/api/angular/?method=app_login', {
			email: login,
			pwd: pwd,
			remember: true
		}, function(res){
			btn.button('reset');
			console.log(res);
			if(res.status == "success"){
				adminUser = {
					login: login,
					pwd: pwd,
					key: res.user.key,
					avatar: res.user.avatar,
					name: res.user.display_name,
					id: res.user.ID
				};
				console.log(adminUser);
				$.totalStorage('admin_user', adminUser);
				loginLog.html('<p class="text-success">You are logged in as '+res.user.user_login+'</p>');
				drawUser();
				setTimeout(function(){
					$('#creds-status').hide();
					$('#settings-modal').modal('hide');
				}, 800);
			} else {
				if(res.message){
					loginLog.html('<p class="text-danger">Connection failed: '+res.message+' (code '+res.code+')</p>');
				}
			}
		});
	}

	if(path != ""){
		// Might be the path we are setting up
		$.totalStorage('video_path', path);
		if(login == "" || pwd == ""){
			$('#settings-modal').modal('hide');
			btn.button('reset');
		}
	}



	

}

function checkSettings(){
	var login = $('#admin-login').val(),
		pwd = $('#admin-pwd').val(),
		path = $('#upload-path').val();

	if(login == "" || pwd == "" || path == ""){
		if(confirm("One or more fields are empty, do you wish to save anyway ?")){
			saveSettings(login, pwd, path);
		} else {
			return;
		}
	} else {
		saveSettings(login, pwd, path);
	}
}

function logout(){
	adminUser = undefined;
	$.totalStorage('admin_user', null);
	drawUser();
}

function openPublishModal(e){
	var index = $(this).data('index');
	currIndex = index;
	console.log(index);
	if(!records[currIndex].file) return alert("You need to encode the video before sending the cut !");
	if(!adminUser) {
		$('#settings-modal').modal('show');
	} else {
		$.get(endpoint+'/cast', function(r){
			console.log(r);
			var castHtml = '<li class="select-actor" data-id="0" data-name="Unidentified" data-image="" data-desc="Unknown actor"><div class="actor-avatar" style="background-image:url(http://placehold.it/300x300);"></div><span class="name">Unidientified</span><span class="role">Unknown actor</span></li>';
			var tmpl =  '<li class="select-actor" data-id="{{id}}" data-name="{{name}}" data-image="'+ tmdb.images.base_url + "original" + '{{profile_path}}" data-desc="{{character}}">';
				tmpl += '<div class="actor-avatar" style="background-image: url('+ tmdb.images.base_url + tmdb.images["profile_sizes"][1] + '{{profile_path}})" alt=""></div>';
				tmpl += '<span class="name">{{name}}</span>';
				tmpl += '<span class="role">{{character}}</span>';
				tmpl += '</li>';
			for(i in r.cast){
				castHtml += Mustache.render(tmpl, r.cast[i]);
			}
			$('#cast-list').html(castHtml);
			$('#publish-form .model').each(function(){
				var prop = $(this).data('prop');
				if(records[index][prop] != undefined) $(this).val(records[index][prop]);
			});
			$('#publish-modal').modal('show');
			records[currIndex].file;
			if(records[currIndex].file) drawSmallPlayer(records[currIndex].file);
		});

		
	}
}

function setActor(e){
	var actor = $(this).data();
	console.log(actor);
	records[currIndex].actor = actor;
	$(this).siblings().fadeOut(300);
}

function encodeVideo(e){
	if(!videoPath) return alert("Please specify an output folder in the settings");
	var data = $(this).data();
	var index = data.index;
	var path = file.path;
	var stamp = new Date().getTime();
	var filename = movie.id+"_cut_"+stamp;
	$(this).css('color', 'yellow');
	$.post('/encode', {source: path, start: records[index].start, end: records[index].end, filename: filename, target: videoPath}, function(res){
		console.log(res);
		if(res.status == "success"){
			$(this).css('color', 'green');
			records[index].file = res.path;
			records[index].hasFile = true;
			$.totalStorage(recordsName, records);
		} else {
			$(this).css('color', 'red');
			alert(res.message);
		}
	}.bind(this));

}

function escapeShell(str){
	return ''+str.replace(/(["\s'$`\\])/g,'\\$1')+'';
}

function drawUser(force){
	var tpl,
		recapHtml,
		errorMsg;

	if(!adminUser){
		recapHtml = '<i class="fa fa-circle" style="color: red;"></i> You are not connected';
		errorMsg = '<p class="text-warning">You haven\'t set your Cultcut credentials. Please do so in order to publish your Cuts later.</p>';
		$('#creds-status').html(errorMsg).show();		
		$('#admin-login').val("");
		$('#admin-pwd').val("");
		if(force) $('#settings-modal').modal('show');
	} else {
		tpl = '<img src="{{avatar}}" id="user-avatar" alt=""> You are connected as {{name}}';
		recapHtml = Mustache.render(tpl, adminUser);

		var msg = '<p class="text-success">You are connected as '+adminUser.name+'. <a href="#" id="logout">Log out</a></p>';
		$('#admin-login').val(adminUser.login);
		$('#admin-pwd').val(adminUser.pwd);
		$('#creds-status').html(msg).show();
	}
	$('#user-recap').html(recapHtml);

}

function backHome(){
	return document.location.reload();
}

function resetPlayer(){
	var time = player.currentTime();
	player.dispose();
	$('#player-wrap').append('<video id="player" class="video-js vjs-default-skin" />');
	player = videojs('player', {
		controls: true,
		autoplay: true
	}, function(){
		$('#player-wrap').fadeIn(500);
		Mousetrap.bind("space", function(){
			return (player.paused()) ? player.play() : player.pause();
		});
		$('#player').find('.vjs-control-bar').addClass('will-hide');
	}).src(fileURL).ready(function(){
		console.log("READY !");
	});

	player.on('play', function(){
			closeInfos();
			if(player.seekedAlready) return;
			setTimeout(function(){
				console.log("Time :", time);
				player.currentTime(time);
				player.seekedAlready = true;
			}, 1000);
	});
}

$(document).ready(function(){

	Mousetrap.bind("ctrl+i", showInspector);

	adminUser = $.totalStorage('admin_user') || undefined;
	videoPath = $.totalStorage('video_path') || undefined;

	drawUser(true);

	$('#upload-path').val(videoPath);

	// get TMDB config
	$.get('/tmdb', function(r){
		if(r.status == "running"){
			tmdb = r.conf;
		}
	});

	// check for dependencies
	$.get('/status', function(r){
		// ffmpegStatus = r.ffmpeg;
		// guessitStatus = r.guessit;
		if(!r.ffmpeg){
			$('#ffmpeg-status').html('<p class="text-danger">FFMPEG is not detected. Install Bower and run in terminal as root:</p><pre>bower install ffmpeg</pre><p>Then quit and relaunch the app</p>');
		}
		if(!r.guessit){
			$('#guessit-status').html('<p class="text-danger">Python and guessit are not detected. Install Bower and run in terminal as root:</p><pre>bower install python \r\npip install guessit</pre><p>Then quit and relaunch the app</p>');
		}
	});


	body = $('body');

	// Random backdrop at first
	$.getJSON('http://dev.cultcut.com/facelift/wp/api/cuts/?method=random_bd&callback=?', function(json){
		$('body, #infos').css({"background-image": "url("+json.bd+")"});
	});
	
	$('#help').tooltip({
		html: true,
		placement: 'bottom',
		container: 'body'
	});
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
		playMovie(data.id, data.backdrop, data.type);
		return false;
	});

	$('#specify').on('submit', function(e){
		e.preventDefault();
		var id = $('#tmdb_id').val();
		var type = $('#manual-type').val();
		playMovie(id, null, type);
		return false;
	});

	$('.seek-back').tooltip();
	
	$('#player-wrap').on('mousemove', function(){

	    var thiis  = $(this),
	        time   = thiis.data('timer'),
	        buffer = thiis.data('buffer'),
	        newTime;

	    if (!buffer){

	        if (time){

	            clearTimeout(time);
	        }

	        $('.will-hide').fadeIn(300);

	        thiis.removeClass('nocursor');

	        newTime = setTimeout(function(){

	            thiis.addClass('nocursor');
	            $('.will-hide').fadeOut(300);
	            thiis.data('buffer', true);

	        }, 2000);
	    } else {

	        thiis.data('buffer', false);
	    }

	    thiis.data('timer', newTime);
	});

	// Global events
	
	$('#upload-path').on('click', function(e){
		e.preventDefault();
		$('#choose-upload-path').trigger('click');
	});

	$('#choose-upload-path').on('change', setUploadPath);
	
	$('#save-settings').on('click', checkSettings);

	$('#choose-file').on('click', function(e){
		e.preventDefault();
		$('#file').trigger('click');
	});

	$('#file').on('change', guess);

	$('#logout').on('click', logout);

	//events in movie mode
	$('#refresh-records').click(drawRecords);
	$('#set-title').on('submit', submitTitle);
	body.on('click', '.open-infos', openInfos);
	body.on('click', '.open-infos.opened', closeInfos);
	body.on('click', '.tocut', goToCut);
	body.on('click', '.action-edit-title', openTitleModal);
	body.on('click', '.action-delete', deleteItem);
	body.on('click', '.action-publish', openPublishModal);
	body.on('click', '.action-encode', encodeVideo);
	body.on('click', '.select-actor', setActor);
	body.on('click', '.seek-back', seekBack);
	
	$('#back-home').on('click', backHome);
	$('#reset-player').on('click', resetPlayer);
	$('#publish-cut').on('click', publishCut);
	

});
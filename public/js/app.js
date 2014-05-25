var body,
	player, 
	file, 
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
	ffmpegStatus;


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
		title: movie.original_title+" - Cut " + (records.length + 1),
		start: undefined,
		end: undefined,
		status: "draft"
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
		tmp = '<li class="s-{{status}}"><a href="#" class="tocut" data-start="{{start}}" data-index="'+i+'" data-end="{{end}}">{{title}}';
		tmp += '<span class="time">From '+secToTime(records[i].start)+' to '+secToTime(records[i].end)+'</span>';
		tmp += '</a><i class="fa fa-circle status-light"></i>';
		tmp += '<ul class="actions">';
		tmp += '<li><a data-placement="top" title="Edit title" class="tipped action-edit-title" data-index="'+i+'" href="#"><i class="fa fa-edit"></i></a></li>';
		tmp += '<li><a data-placement="top" title="Delete" class="tipped action-delete" data-index="'+i+'" href="#"><i class="fa fa-times"></i></a></li>';
		tmp += '<li><a data-placement="top" title="Publish" class="tipped action-publish" data-index="'+i+'" href="#"><i class="fa fa-cloud-upload"></i></a></li>'
		tmp += '</ul></li>';
		html += Mustache.render(tmp, records[i]);
	}
	if(records.length <= 0) html = '<li class="msg">You haven\'t recorded any Cuts for this movie yet</li>';
	console.log(html);
	$('#records-list').append(html);
	$('.tipped').tooltip();
	//return false;
}

function playMovie(id, backdrop){
	Mousetrap.bind("i", startRecord);
	Mousetrap.bind("o", endRecord);
	Mousetrap.bind("esc", leaveFullScreen);
	Mousetrap.bind("ctrl+f", enterFullScreen);
	$('body, #infos').css({"background-image": "url(" + tmdbImg( 'backdrop', 3, backdrop ) + ")"});
	$("#first-step").fadeOut(300, function(){
		$.get('/movie/'+id, function(r){
			movie = r;
			records = $.totalStorage('records_'+r.id) || [];
			// Instanciate blank record ready for use
			curRecord = {
				title: movie.original_title+" - Cut " + ( records.length + 1 ),
				start: undefined,
				end: undefined,
				status: "draft"
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

function setTitle(index, title){
	console.log("setting title for");
	var rec = records.slice(index, index+1)[0];
	console.log(rec);
	rec.title = title;
	console.log("as "+title);
	records[index] = rec;
	$.totalStorage('records_'+movie.id, records); 
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
	$(this).removeClass('opened');
	$('#player-wrap').removeClass('aside');
	$('#infos').find('.row-fluid').fadeOut(500, callback);
}

function deleteItem(e){
	e.preventDefault();
	var data = $(this).data(),
		index = data.index;
	if(confirm("Are you sure you want to delete "+ records[index].title+" ?")){
		records.splice(index, 1);
		$.totalStorage('records_'+movie.id, records);
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

$(document).ready(function(){

	adminUser = $.totalStorage('admin_user') || undefined;
	videoPath = $.totalStorage('video_path') || undefined;

	drawUser();

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
		playMovie(data.id, data.backdrop);
		return false;
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
	

});
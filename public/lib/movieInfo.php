<?php
header("Content-Type: text/html;charset=utf-8");
header('Content-type: application/json');

$api_key = 'bce753a11c69e6ae5ec03c4ab2ea1484';
$title = stripslashes(urldecode($_GET['title']));
$mode = $_GET['mode'];
$offset = $_GET['offset'];
$tmdb_id = $_GET['tmdb_id'];
$actor = $_GET['actor'];

/*if(!$_SERVER["HTTP_X_REQUESTED_WITH"] || !$title){
	exit;
}*/


include 'tmdb.php';

$tmdb = new TMDb($api_key);


if ($tmdb_id){
	
	$info = $tmdb->getMovie($tmdb_id);

	if (!empty($info)){
			echo $info;
		}
		else {
			echo 'Fin des resultats ||| '.$title;
			
		}

} else if ($actor){
	
	$actors_results = $tmdb->getPerson($actor);
	$actor = json_decode($actors_results);
	$actor = json_encode($actor[0]);
	echo $actor;
	
} else {

	$search_results = $tmdb->searchMovie($title);
	$result = json_decode($search_results);
	$id = $result[$offset]->id;
	
	$info = $tmdb->getMovie($id);
	
	
	if ($mode === 'search') {
	
		echo $search_results;
		
	}
	
	else if ($mode === 'display'){
		if (!empty($info)){
			echo $info;
		}
		else {
			echo 'Fin des resultats ||| '.$title;
			
		}
	
	}

	else {
	
		echo 'Requête non connue.';
	
	}


}





 ?>
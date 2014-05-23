<?php 

header("Content-Type: text/html;charset=utf-8");
header('Content-type: application/json');

include 'tmdb.php';
require 'TVDB.php';

// ini_set('display_errors',1); 
// error_reporting(E_ALL);

// Variables
$api_key = 'bce753a11c69e6ae5ec03c4ab2ea1484'; // tmdb api key
$scope = $_GET['scope']; // tv or cinema for now
$query = $_GET['q']; // search term
$mode = $_GET['mode']; // further down the road

if (isset($scope) && $scope == 'tv'){
	switch ($mode) {
		case 'search':
			$results = TV_Shows::search(urldecode($query));
			$results = array('results' => $results);
		break;

		case 'get':
			$results = TV_Shows::findById($query);
		break;

		case 'banners':
			$results = TV_Shows::getBanners($query);
		break;
		
		case 'cast':
			$results = TV_Shows::getCast($query);
		break;
		
	}
} else if(isset($scope) && $scope == 'cinema'){
	$tmdb = new TMDBv3($api_key, 'en');

	switch ($mode) {
		case 'search':
			$results = $tmdb->searchMovie(urldecode($query));
			// $results = json_decode($results);
		break;

		case 'get':
			$results = $tmdb->movieDetail($query);
		break;

		case 'cast':
			$results = $tmdb->movieCast($query);
		break;
	}

}

print_r(json_encode($results));
?>
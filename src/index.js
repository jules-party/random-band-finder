import * as fs from 'fs';
import express from 'express';
import https from 'https';
import http from 'http';
import * as cheerio from 'cheerio';
import {MusicBrainzApi} from 'musicbrainz-api';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _PORT_ = 80;

var __limit = 0;
var __offset = 0;

const mbApi = new MusicBrainzApi({
	appName: 'random-band-finder',
	appVersion: '1.0.0',
});

const _HTTPS_INFO_ = {
	key: '/usr/local/etc/letsencrypt/live/example.com/privkey.pem',
	cert: '/usr/local/etc/letsencrypt/live/example.com/fullchain.pem'
};
const _HTTPS_OPTIONS_ = {
	key: fs.readFileSync(_HTTPS_INFO_.key),
	cert: fs.readFileSync(_HTTPS_INFO_.cert)
};

const app = express();

app.use(express.json());
app.use(express.urlencoded({
	extended: true
}));

app.use(express.static(__dirname + '/www', {
	extensions: ['html', 'htm']
}));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/www/index.html')
});

app.post('/', async (req, res) => {
	fs.readFile(__dirname + '/www/index.html', "utf-8", async (err, data) => {
		if (err) throw err;
		var $ = cheerio.load(data);
		__limit = isNaN(req.body.limit) ? 0 : req.body.limit;
		__offset = isNaN(req.body.offset) ? 0 : req.body.offset;

		if(req.body.findArtist === 'false' || req.body.genre.length === 0) {
			return;
		}

		// Start looking for artists based on query
		var args = [req.body.genre, __limit, __offset];
		const items = await getArtistsNames(args[0], args[1], args[2]);
		var band = items[Math.floor(Math.random()*items.length)];

		res.json({band: band});
	});
});

http.createServer(app).listen(80);
https.createServer(_HTTPS_OPTIONS_, app).listen(443);

async function getArtistsNames(genres, customLimit = 0, customOffset = 0) {
	console.log(`--- Finding Artists... ---\nQuery: ${genres}\nLimit: ${customLimit}\nOffset: ${customOffset}`);
	var json_array = [];
	var artists_names = [];
	genres = genres.toLowerCase();
	var file_name = __dirname + `/searches/${genres.replaceAll(',','_').replaceAll(' ', '-')}-${customOffset}-${customLimit}.json`

	if(fs.existsSync(file_name)) {
		var results;
		var rawdata = fs.readFileSync(file_name);
		results = JSON.parse(rawdata);

		// Get artists names from file
		for(let i = 0; i < results.length; i++) {
			for(let k = 0; k < results[i].artists.length; k++) {
				artists_names.push(results[i].artists[k].name);
			}
		}
	} else {
		// Gets the amount of artists in query
		const temp = await mbApi.search('artist', {query: `tag:\"${genres}\"`, offset: 0, limit: 1});
		var count = temp.count
		if(count == 0) return;

		if(customLimit < 100 && customLimit != 0) {
			const results = await mbApi.search('artist', {query: `tag:\"${genres}\"`, offset: customOffset, limit: customLimit});
			json_array.push(results);
		} else if(customLimit > 100) {
			// Get the first results that are in the 100 limit range
			// For example: if the limit is 256, we would get the first 200 results
			for(let i = 0; i <= ((customLimit - (customLimit % 100)) / 100); i++) {
				const results = await mbApi.search('artist', {query: `tag:\"${genres}\"`, offset: (i * 100) + customOffset, limit: 100});
				json_array.push(results);
			}
			// Get the rest of the results, refering to the above example, we would get the rest of the results (56, starting at 200).
			const results = await mbApi.search('artist', {query: `tag:\"${genres}\"`, offset: (customLimit - (customLimit % 100)) + customOffset, limit: (customLimit % 100)});
			json_array.push(results);
		} else {
			for(let i = 0; i <= ((count - (count % 100)) / 100); i++) {
				const results = await mbApi.search('artist', {query: `tag:\"${genres}\"`, offset: (i * 100) + customOffset, limit: 100});
				json_array.push(results);
			}
		}

		// Get all names of artists from results
		for(let i = 0; i < json_array.length; i++) {
			for(let k = 0; k < json_array[i].artists.length; k++) {
				artists_names.push(json_array[i].artists[k].name);
			}
		}
		
		// Save file of results if someone uses the same search query.
		fs.writeFile(__dirname + `/searches/${genres.replaceAll(',','_').replaceAll(' ', '-')}-${customOffset}-${customLimit}.json`, JSON.stringify(json_array), 'utf8', function(err) {
			if(err) {
				console.log(err);
			}
		});
	}

	console.log('--- Found artists... ---')
	return artists_names;
} 

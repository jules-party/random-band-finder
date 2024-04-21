import * as fs from 'fs';
import express from 'express';
import * as cheerio from 'cheerio';
import {MusicBrainzApi} from 'musicbrainz-api';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var __limit = 0;
var __offset = 0;

const mbApi = new MusicBrainzApi({
	appName: 'random-band-finder',
	appVersion: '1.0.0',
});

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
		if(req.body.genreInput == undefined) {
			__limit = req.body.limitInput || 0;
			__offset = req.body.offsetInput || 0;

			res.send($.html());
			return;
		} else if(req.body.genreInput.length === 0) {
			res.send($.html());
			return;
		}

		var args = [req.body.genreInput, __limit, __offset];
		const items = await getArtistsNames(args[0], args[1], args[2]);
		var band = items[Math.floor(Math.random()*items.length)];
		$('#band').text(band);
		$('#genre').val(args[0]);

		res.send($.html());
	});
});


app.listen(80);

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

		for(let i = 0; i < results.length; i++) {
			for(let k = 0; k < results[i].artists.length; k++) {
				artists_names.push(results[i].artists[k].name);
			}
		}
	} else {
		const temp = await mbApi.search('artist', {query: `tag:\"${genres}\"`, offset: 0, limit: 1});
		var count = temp.count
		if(customLimit < 100 && customLimit != 0) {
			const results = await mbApi.search('artist', {query: `tag:\"${genres}\"`, offset: customOffset, limit: customLimit});
			json_array.push(results);
		} else {
			for(let i = 0; i <= ((count - (count % 100)) / 100); i++) {
				const results = await mbApi.search('artist', {query: `tag:\"${genres}\"`, offset: (i * 100) + customOffset, limit: 100});
				json_array.push(results);
			}
		}

		var jsonString = JSON.stringify(json_array);
		const jsonObj = JSON.parse(jsonString);

		for(let i = 0; i < jsonObj.length; i++) {
			for(let k = 0; k < jsonObj[i].artists.length; k++) {
				artists_names.push(jsonObj[i].artists[k].name);
			}
		}
		
		fs.writeFile(__dirname + `/searches/${genres.replaceAll(',','_').replaceAll(' ', '-')}-${customOffset}-${customLimit}.json`, jsonString, 'utf8', function(err) {
			if(err) {
				console.log(err);
			}
		});
	}

	console.log('--- Found artists... ---')
	return artists_names;
} 

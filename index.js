// index.js
import https from 'https'
import express from 'express'
import axios from 'axios'
import he from 'he'
import { convert } from 'html-to-text'
import { readFileSync } from 'fs'

const app = express();
const contentMatch = /content="(?<content>.{31,})"/gis;
const maxTextLength = 31;
const aceptHost = 'example.org'; //Your host name
const aceptUrlStr = ['fxtwitter.com', 'vxtwitter.com', 'fixvx.com', 'www.phixiv.net'];

function invalidUrl(url) {
  let invalid = true;
  let urlHost = url.split('/')[1];
  if(url.length < 2) {
    return invalid;
  }
  if(aceptUrlStr.includes(urlHost))
    invalid = false;
  return invalid;
}

function reduceLength(html, host) {
  let lines = html.split('<');
  let i = 0;
  let j = 0;
  let isPixiv = host == 'www.phixiv.net';
  let tmpStr = '';
  let modifiedHtml = '';
  let modified = false;
  let matches = '';
  for(i = 0; i < lines.length; i++) {
    if(lines[i].includes('og:description')) {
	  matches = contentMatch.exec(lines[i]);
	  if(matches) {
		if(isPixiv) {
		  matches.groups.content = convert(he.decode(matches.groups.content));
		}
		tmpStr = 'content="' + matches.groups.content.substring(0, maxTextLength - 3) + '..."';
		lines[i] = lines[i].replace(contentMatch, tmpStr);
	  }
	  modifiedHtml = lines.join('<');
      modified = true;
      break;
    }
  }
  return modified ? modifiedHtml : html;
}

app.get('*', (req, res) => {
  console.log(req.url);
  console.log(req.headers);
  if(invalidUrl(req.url) || aceptHost != req.headers.host) {
	res.status(404).send("Not found.");
  } else {
	let inputUrl = req.url.slice(1);
    let headers = JSON.parse(JSON.stringify(req.headers));
    headers['host'] = inputUrl.split('/')[0];
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      maxContentLength: 5000,
      maxRedirects: 0,
      url: 'https://' + req.url.slice(1),
      headers: headers
    };
    axios.request(config)
    .then((response) => {
      res.send(reduceLength(response.data, headers['host']));
    })
    .catch((error) => {
      console.log(error);
    });
  }
})

// Creating object of key and certificate
// for SSL
const options = {
  key: readFileSync("Your-private-key-path"),
  cert: readFileSync("Your-certificate-path"),
};

// Creating https server by passing
// options and app object
https.createServer(options, app)
  .listen(443, function (req, res) {
    console.log("Server started at port 443");
})

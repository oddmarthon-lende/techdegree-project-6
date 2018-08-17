const cheerio = require('cheerio');
const request = require('request');
const csv     = require('csv');
const fs      = require('fs');

const dataDir = './data';
const baseUrl = 'http://shirts4mike.com/';

function getProduct(link) {
  return new Promise((resolve, reject) => {
    request(`${baseUrl}${link}`, (error, response, body) => {
      if(!error && response.statusCode !== 200)
        error = new Error(`There’s been a ${response.statusCode} error. Cannot connect to ${baseUrl}`);
      if(error) return reject(error);
      const $ = cheerio.load(body);
      resolve({
        "Title"    : $('title').text(),
        "Price"    : $('.shirt-details h1 span.price').text(),
        "ImageURL" : baseUrl + $('div.shirt-picture span img').prop('src'),
        "URL"      : baseUrl + link,
        "Time"     : new Date()
      });
    });
  });
}

function getProductLinks() {
  return new Promise((resolve, reject) => {
    request(`${baseUrl}shirts.php`, (error, response, body) => {
      if(!error && response.statusCode !== 200)
        error = new Error(`There’s been a ${response.statusCode} error. Cannot connect to ${baseUrl}`);
      if(error) return reject(error);
      const $ = cheerio.load(body);
      const links = [];
      $('ul.products li a')
        .each((i, link) => links.push($(link).prop('href')));
      resolve(links);
    });
   });
}

function writeToCSVFile(products) {

  if(!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const reader = csv.stringify(products, {
    formatters: {
      date: date => date.toJSON()
    },
    header: true
  });

  const date = new Date();
  const filename = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.csv`;
  const output = fs.createWriteStream(`${dataDir}/${filename}`);

  reader.pipe(output);

}

function writeToErrorFile(error) {
  fs.appendFile('./scraper-error.log', `[${new Date()}] ${error.message}\n`, 'utf8', (error) => error && console.error(error.message));
}

getProductLinks()
.then((links => {
  Promise.all(links.map((link) => getProduct(link)))
  .then(writeToCSVFile);
}))
.catch(writeToErrorFile);

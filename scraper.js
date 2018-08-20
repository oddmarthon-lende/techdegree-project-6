const cheerio = require('cheerio');
const request = require('request');
const csv     = require('csv');
const fs      = require('fs');

const dataDir = './data';
const baseUrl = 'http://shirts4mike.com/';

// Checks the response's statusCode
// and returns a new Error if not 200 OK
function checkResponse(error, response) {
  if(!error && response.statusCode !== 200)
    return new Error(`There’s been a ${response.statusCode} error. Cannot connect to ${baseUrl}`);
}

// Gets a product
function getProduct(link) {
  return new Promise((resolve, reject) => {
    request(`${baseUrl}${link}`, (error, response, body) => {
      error = error || checkResponse(error, response);
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

// Gets the product links
function getProductLinks() {
  return new Promise((resolve, reject) => {
    request(`${baseUrl}shirts.php`, (error, response, body) => {
      error = error || checkResponse(error, response);
      if(error) return reject(error);
      const $ = cheerio.load(body);
      const links = [];
      $('ul.products li a')
        .each((i, link) => links.push($(link).prop('href')));
      resolve(links);
    });
   });
}

// Pad a number with zero if the length is less than 2
function padZero(num) {
  num = '' + num;
  num = num.length < 2 ? '0' + num : num;
  return num;
}

// Write array of product objects to CSV file
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
  const filename = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}.csv`;
  const output = fs.createWriteStream(`${dataDir}/${filename}`);

  reader.pipe(output);

}

// Writes to the error file
function writeToErrorFile(error) {
  fs.appendFile('./scraper-error.log', `[${new Date()}] ${error.message}\n`, 'utf8', (error) => error && console.error(error.message));
}

// Runs the functions above
// and generates a CSV file with the products
getProductLinks()
.then((links => {
  Promise.all(links.map((link) => getProduct(link)))
  .then(writeToCSVFile);
}))
.catch(writeToErrorFile);

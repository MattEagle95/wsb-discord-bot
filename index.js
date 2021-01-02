const winston = require('winston');
const Parser = require('rss-parser');
const Discord = require("discord.js");
const config = require("./config.json");
const nyse_companies = require('./data/nyse_companies.json');
const { resolve } = require('bluebird');
require('dotenv').config()

const logger = winston.createLogger({
  format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
      winston.format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`),
  ),
  transports: [
      new winston.transports.Console({
          level: 'info',
          handleExceptions: true
      }),
      new winston.transports.File({
          level: 'info',
          dirname: "logs",
          filename: config.LOG_FILENAME,
          handleExceptions: true
      })
  ],
  exitOnError: false
})

let cacheData = {
  top: {
    lastUpdate: 0,
    reply: ''
  },
}

const parser = new Parser()
const client = new Discord.Client();

client.login(process.env.DISCORD_BOT_TOKEN);

client.on("message", function(message) {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.PREFIX)) return;

  const commandBody = message.content.slice(config.PREFIX.length);
  const args = commandBody.split(' ');
  const command = args.shift().toLowerCase();

  if (command === "run") {
    if(cacheData.top.lastUpdate > Date.now() - config.CACHE_TIME) {
      message.reply(`Cached data...`);
      message.reply(cacheData.top.reply);
      return;
    }

    cacheData.top.lastUpdate = Date.now()
    message.reply(`Gathering data...111111111`);
    parseUrl('https://www.reddit.com/r/wallstreetbets/top/')
    .then(feed => {
      promises = []
      feed.items.forEach(feedPost => {
        promises.push(parseUrl(feedPost.link).then(post => {
          let result = post.title
            post.items.forEach(comment => {
              result += comment.contentSnippet
          })
          return result
        }))
      })
      
      return Promise.all(promises).then((values) => {
        return values
      });
    })
    .then(result => {
      resultStr = ''
      result.forEach(str => {
        resultStr += str
      });

      replyStr = "";
      searchContent(resultStr).forEach(element => {
        if (element.count > 2) {
          replyStr += element.symbol + ' : ' + element.count + '\n'
        }
      });
      cacheData.top.reply = replyStr
      message.reply(replyStr);
    })
    .catch(err => logger.error(err));
  }
});

function parseUrl(link) {
  return new Promise((resolve, reject) => {
    parser.parseURL(link + '.rss', (err, feed) => {
      if (err) {
        reject(err)
        return
      }

      resolve(feed)
    })
  })
}

function searchContent(str) {
    const result = []

    nyse_companies.forEach(filterElement => {
        result.push({
            symbol: filterElement.symbol,
            companyName: filterElement.companyName,
            count: searchSymbol(str, filterElement.symbol)
        })
    });

    result.sort(function (a, b) {
        return a.count - b.count;
    })

    return result.slice(0,10);
}

function searchSymbol(str, symbol) {
  if(symbol === 'DD' || symbol === 'A' || symbol === 'YOLO' || symbol === 'ON' || symbol === 'HOLD' || symbol === 'MOON' || symbol === 'GO' || symbol === 'FOR')
    return (str.match(new RegExp('\\s\\$?' + symbol + '\\s', 'gm')) || []).length
}
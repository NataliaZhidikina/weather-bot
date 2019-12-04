let TelegramBot = require("node-telegram-bot-api");
let axios = require("axios");

let token = "1051224289:AAF7KIxrwIsINHQLk3AavHzdHsrKC_-GTVg";
let openWeatherMapId = "b4a28960ab9dcca3c3e2167a25eca3df";

let bot = new TelegramBot(token, {
    webhook: {
        port: PORT || 443,
        host: '0.0.0.0'
    },
    polling: {
        interval: 1000
    } 
});

// OpenWeatherMap endpoint for getting weather by city name
let cityWeatherEndpoint = city =>
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${openWeatherMapId}`;
// OpenWeatherMap endpoint for getting weather by latitude and longitude
let forcastWeatherEndpoint = city =>
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${openWeatherMapId}`;
// <img width="100" heightsrc="${weatherIcon(
// weather.icon
// )}" alt="weather icon" />
let weatherIcon = icon => `http://openweathermap.org/img/w/${icon}.png`;
let weatherHtmlTemplate = (name, main, weather, wind, clouds, date) =>
    `<b>${date ? date : ""}</b>
The weather in <b>${name}</b>:
<b>${weather.main}</b> - ${weather.description}
Temperature: <b>${main.temp} °C</b>
Pressure: <b>${main.pressure} hPa</b>
Humidity: <b>${main.humidity} %</b>
Wind: <b>${wind.speed} meter/sec</b>
Clouds: <b>${clouds.all} %</b>
`;

let formatDate = dt =>
    `Date: ${new Date(dt * 1000).toLocaleDateString()}, time: ${new Date(
    dt * 1000
  ).toLocaleTimeString()}`;
let getDate = dt => `${new Date(dt * 1000).toLocaleDateString()}`;
let getForecast = (chatId, city, days = 1) => {
    let endpoint = forcastWeatherEndpoint(city);
    axios
        .get(endpoint)
        .then(resp => {
            let oldDate = "",
                currentDay = new Date();
            currentDay = currentDay.getDate();
            lastCity = resp.data.city.name;

            let data = resp.data.list.find(item => {
                let date = new Date(item.dt * 1000);
                return currentDay + 1 === date.getDate();
            });

            let resultForecast = weatherHtmlTemplate(
                lastCity,
                data.main,
                data.weather[0],
                data.wind,
                data.clouds,
                formatDate(data.dt)
            );

            bot.sendMessage(chatId, resultForecast, {
                parse_mode: "HTML"
            });
        })
        .catch(error => errorHandler(error, chatId, city));
};

let getWeather = (chatId, city) => {
    let endpoint = cityWeatherEndpoint(city);

    axios
        .get(endpoint)
        .then(resp => {
            let { name, main, weather, wind, clouds } = resp.data;
            lastCity = name;
            //bot.sendPhoto(chatId, weatherIcon(weather[0].icon));
            bot.sendMessage(
                chatId,
                weatherHtmlTemplate(name, main, weather[0], wind, clouds), {
                    parse_mode: "HTML"
                }
            );
        })
        .catch(error => errorHandler(error, chatId, city));
};
let errorHandler = (error, chatId, city) => {
    console.log("error", error);

    if (city) {
        bot.sendMessage(
            chatId,
            `Ooops...I couldn't be able to get weather for <b>${city}</b>`, {
                parse_mode: "HTML"
            }
        );
        return;
    }
    bot.sendMessage(chatId, `Please, send corect city name`, {
        parse_mode: "HTML"
    });
};

let prevCommand = "",
    lastCity = "";

bot.onText(/\/forecast/, (msg, match) => {
    if (match.input.split(" ").length > 1) lastCity = match.input.split(" ")[1];
    forecastHandler(msg.chat.id, lastCity);
});

let forecastHandler = (chatId, city) => {
    prevCommand = "forecast";
    lastCity = city ? city : lastCity;
    if (lastCity === undefined) {
        bot.sendMessage(chatId, `Please provide city name`);
        return;
    }
    getForecast(chatId, city);
};

bot.onText(/^((?!\/forecast)(?!\/current_weather)(?!\/start).)*$/, msg => {
    switch (prevCommand) {
        case "current_weather":
            weatherHandler(
                msg.chat.id,
                msg.text
                .toString()
                .toLowerCase()
                .split(" ")[0]
            );
            break;
        case "forecast":
            forecastHandler(
                msg.chat.id,
                msg.text
                .toString()
                .toLowerCase()
                .split(" ")[0]
            );
            break;
    }
});

bot.onText(/\/current_weather/, (msg, match) => {
    if (match.input.split(" ").length > 1) lastCity = match.input.split(" ")[1];
    weatherHandler(msg.chat.id, lastCity);
});

let weatherHandler = (chatId, city) => {
    prevCommand = "current_weather";
    lastCity = city ? city : lastCity;
    if (lastCity === undefined) {
        bot.sendMessage(chatId, `Please provide city name`);
        return;
    }
    getWeather(chatId, city);
};

bot.onText(/\/start/, msg => {
    let chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        `Welcome at <b>@weather_telegram_bot</b>  
          Available commands:
          /current_weather <b>city</b> - shows weather for selected <b>city</b>
          /forecast <b>city</b> - shows forecast for selected <b>city</b>
  `, {
            parse_mode: "HTML"
        }
    );
});
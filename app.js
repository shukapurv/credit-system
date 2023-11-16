var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var IngestRouter = require('./routes/ingest');
var CustomerRouter = require('./routes');



var app = express();
const bodyParser = require("body-parser");
const swaggerJsdoc = require("swagger-jsdoc");
const    swaggerUi = require("swagger-ui-express");

const dataIngestionQueue = require('./queues/dataIngestionQueue');
const dataIngestionProcessor = require('./queues/dataIngestionProcessor');

dataIngestionQueue.process(dataIngestionProcessor);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/ingest', IngestRouter);
app.use('/', CustomerRouter);


const db = require("./models");

db.sequelize.sync()
    .then(() => {
      console.log("Synced db.");
    })
    .catch((err) => {
      console.log("Failed to sync db: " + err.message);
    });

const options = {
    definition: {
        openapi: "3.1.0",
        info: {
            title: "Credit-system",
            version: "0.1.0",
            description:
                "This is a simple CRUD API for credit system",
            license: {
                name: "MIT",
                url: "https://spdx.org/licenses/MIT.html",
            }
        },
        servers: [
            {
                url: `http://localhost:${process.env.APP_DOCKER_PORT}`,
            },
        ],
    },
    apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(options);
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs)
);

app.use(function(req, res, next) {
    next(createError(404));
});


app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

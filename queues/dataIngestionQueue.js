const Queue = require('bull');
require("dotenv").config()

const redisHost = process.env.REDIS_HOST || 'localhost';

const dataIngestionQueue = new Queue('dataIngestion', `redis://${redisHost}:6379`);

module.exports = dataIngestionQueue;
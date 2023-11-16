var express = require('express');
var router = express.Router();
const dataIngestionQueue = require('../queues/dataIngestionQueue');


router.get('/', function(req, res, next) {
  dataIngestionQueue.add({
    customerDataPath: 'data/customer_data.xlsx',
    loanDataPath: 'data/loan_data.xlsx'
  });

  res.status(202).send('Data ingestion initiated');});

module.exports = router;

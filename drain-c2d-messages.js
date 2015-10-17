// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// **drain-c2d-messages**
// Given an Azure IoT Hub device connection string, query the IoT Hub for a
// cloud-to-device message. If found, query again and repeat until the message
// queue is drained. Then sleep for one minute and query again.
//
// I used this script to keep my test device's message queue clean while I was
// doing development work on the azure-iothub package.

'use strict';

var device = require('azure-iot-device');
var async = require('async');

var connectionString = process.argv[2];

var client = new device.Client(connectionString, new device.Https());
var again = false;

receiveAll();

function receiveAll() {
  console.log('>> wake up');
  var start = Date.now();
  async.doWhilst(
    function fn(done) {
      receiveOne(function (received) {
        again = received;
        done();
      });
    },
    function test() {
      return again;
    },
    function callback(err) {
      if (!err) {
        var duration = Date.now() - start;
        console.log('-- duration: ' + duration + 'ms');
        console.log('<< sleep 60s');
        setTimeout(receiveAll, 60000);
      }
    }
  );
}

function receiveOne(done) {
  client.receive(function (err, res, msg) {
    if (err) {
      printResultFor('receive')(err, res);
      done(false);
    }
    else {
      if (res.statusCode === 204) {
        done(false);
      }
      else {
        console.log('Received data: ' + msg.getData());
        client.complete(msg, printResultFor('complete'));
        done(true);
      }
    }
  });
}

function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res && (res.statusCode !== 204)) {
      console.log(op + ' status: ' + res.statusCode + ' ' + res.statusMessage);
    }
  };
}

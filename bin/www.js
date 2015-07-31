#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('pipowars.com:server');
var http = require('http');


/*
* redis connect
*/
var redis = require("redis"),
    client = redis.createClient();


/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
 
var io = require('socket.io').listen(server);

client.del('pipoRooms',function(){});

io.on('connection',function(socket){
  socket.on('createRoom',function(data){
    client.set('room'+socket.id,0);
    client.lrange('pipoRooms',0,-1,function(err,_data){
      var isAvailable = false;

      for(i in _data){
        if(_data[i].split(' ')[1] == socket.id){
          isAvailable = true;
          break;
        }
      }

      if(!isAvailable){
        client.lpush('pipoRooms',socket.id);
        socket.emit('loginRoom',socket.id);
      }
    });
  });

  socket.on('loginRoom',function(data){
    socket.broadcast.emit(data,socket.id,socket.id);
  });

  /*
  * rooms
  */
  setInterval(function(){
    client.lrange('pipoRooms',0,-1,function(err,_data){
      socket.emit('rooms',_data);
    });
  },250); 

  /*
  * down event
  */
  socket.on('down',function(data){
    socket.broadcast.emit(data.id+'control',{ direction : data.direction });
  });
  /*
  * up event
  */
  socket.on('up',function(data){
    socket.broadcast.emit(data.id+'control',{ direction : data.direction });
  });
  /*
  * ball direction
  */
  socket.on('whoTwo',function(data){
    socket.emit('direction'+data,-1);
  })

  socket.on('startGame',function(data){
    client.incr('room'+data.id);
     var run = setInterval(function(){
      client.get('room'+data.id,function(err,r){
        if(r == 2){
         socket.emit('loopStart'+data.id,{ start : true });
        }
      });
    },60);
    socket.on('loopRun',function(d){
      clearInterval(run);
    });
  });

  /*
  * close room
  */
  socket.on('closeRoom',function(){
    client.lrange('pipoRooms',0,-1,function(err,_data){
        for(i in _data){
          if(_data[i] == socket.id){
            client.lrem('pipoRooms',1,_data[i],function(err){});
          }
        }
      });
    client.del('room'+socket.id,function(){});
  });

  /*
  * disconnect
  */
  socket.on('disconnect',function(){
    client.lrange('pipoRooms',0,-1,function(err,_data){
        for(i in _data){
          if(_data[i] == socket.id){
            client.lrem('pipoRooms',1,_data[i],function(err){});
          }
        }
      });
    client.del('room'+socket.id,function(){});
  });
});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

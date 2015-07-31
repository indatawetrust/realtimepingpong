/**
 * pipo js
 */

var pipo = angular.module('pipo',['btford.socket-io','ui.router']);

pipo.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $locationProvider.html5Mode(true);

  $stateProvider
  	.state('pipo',{ 
      url: "/",
      controller : 'game',
      templateUrl : 'views/index.html'
    })
    .state('pipo.game',{ 
      url: ":room",
      controller : 'roomController',
      templateUrl : 'views/game.html'
    });

});

pipo.factory('_io', function (socketFactory) {
	var mySocket = socketFactory();
	mySocket.forward('error');
	return mySocket;
});

pipo.controller('game',function($scope,$http,_io,$state){
	$scope.createRoom = function(){
		_io.emit('createRoom',{ name : 1 });
		_io.on('loginRoom',function(data){
			$state.go('pipo.game',{ room : data });	
		});
		$('#myModal').modal('hide');
	}

	$scope.loginRoom = function(id){
		_io.emit('loginRoom',id);
		$state.go('pipo.game',{ room : id });
		$('#myModal').modal('hide');
		_io.emit('whoTwo',id);
	}

	_io.on('rooms',function(data){
		$scope.rooms = data;
	});	
});

pipo.controller('roomController',function($scope,_io,$state,$stateParams){
	$('#theend').text('');

	$('.index').css({
		'display' : 'none'
	});
	_io.on('direction'+$stateParams.room,function(data){
		$scope.yon = data;
	});

	$scope.start = function(){
		_io.emit('startGame',{ id : $stateParams.room });
	}

	$scope.newGame = function(){
		angular.element(document.querySelector('.index')).css({
			'display' : 'inline'
		});
		_io.emit('closeRoom','close');
		$state.go('pipo');
	}

	var canvas = document.querySelector('canvas');
	var c = canvas.getContext('2d');
	var w = canvas.width,h = canvas.width;
	var _pw = 100,_ph = 10;

	_io.on($stateParams.room,function(data){
		$scope.roomUsers = data;
	});

	function player(i){
		this.x = i.x;
		this.y = i.y;
		this.w = i.w;
		this.h = i.h;
		this.left = false;
		this.right = false;
		this.color = i.color;
		this.score = 0;
		this.draw = function(){
			c.fillStyle = this.color;
			c.fillRect(this.x,this.y,this.w,this.h);
		}
	}

	function ball(i){
		this.x = i.x;
		this.y = i.y;
		this.r = i.r;
		this.vx = i.vx;
		this.vy = i.vy;
		this.color = i.color;
		this.draw = function(){
			c.beginPath();
			c.fillStyle = this.color;
			c.arc(this.x,this.y,this.r,0,Math.PI*2,true);
			c.fill();
			c.closePath();
		}
	}

	var my = new player({
		x : w/2-50,
		y : h-_ph*2,
		w : _pw,
		h : _ph,
		color : '#fff'
	});

	var you = new player({
		x : w/2-50,
		y : _ph,
		w : _pw,
		h : _ph,
		color : '#fff'
	});

	var ball = new ball({
		x : w/2,
		y : h/2,
		r : 10,
		vx : 8,
		vy : 2,
		color : '#fff'
	});

	document.addEventListener('keydown',function(e){
		if(e.keyCode == 39){
			my.left = false;
			if(!my.right)
				_io.emit('down',{ id : $stateParams.room, direction : { right : true }});
			my.right = true;
		}else if(e.keyCode == 37){
			my.right = false;
			if(!my.left)
				_io.emit('down',{ id : $stateParams.room, direction : { left  : true }});
			my.left = true;
		}
	});

	document.addEventListener('keyup',function(e){
		if(e.keyCode == 39){
			my.right = false;
			_io.emit('up',{ id : $stateParams.room, direction : { right : false }});
		}else if(e.keyCode == 37){
			my.left = false;
			_io.emit('up',{ id : $stateParams.room, direction : { left  : false }});
		}
	});

	function theend(){
		if(my.score > you.score){
			$('#theend').text('I won');
		}else if(my.score == you.score){
			$('#theend').text('Drawn');
		}else if(my.score < you.score){
			$('#theend').text('I lost');
		}
	}

	var loop = null;
	function init(){
		c.clearRect(0,0,w,h);

		_io.on($stateParams.room+'control',function(data){
			if(data.direction.right){
				you.right = true;
			}else{
				you.right = false;
			}

			if(data.direction.left){
				you.left = true;
			}else{
				you.left = false;
			}
		});
		
		ball.draw();

		if(ball.x<ball.r+ball.vx){
			ball.vx *= -1;
			//clearInterval(y);
		}else if(ball.x>w-ball.r+ball.vx){
			ball.vx *= -1;
		}

		if(ball.y>h-10*2-ball.r){
			ball.vy *= -1;
		}else if(ball.y<10*2+ball.r){
			ball.vy *= -1;
		}

		if(ball.y-ball.r < you.y+you.h || ball.y+ball.r > my.y){
			if(ball.y-ball.r < you.y+you.h){
				if(ball.x+ball.r>you.x && ball.x<you.x+you.w){
					you.color = '#000';
					++you.score;
					setTimeout(function(){
						you.color = '#fff';
					},10);
				}else{
					clearInterval(loop);
					theend();
				}
			}
			if(ball.y+ball.r > my.y){
				if(ball.x+ball.r>my.x&&ball.x<my.x+my.w){
					my.color = '#000';
					++my.score;
					setTimeout(function(){
						my.color = '#fff';
					},10);
				}else{
					clearInterval(loop);
					theend();
				}
			}
		}

		ball.x -= ball.vx;
		
		if($scope.yon == -1)
			ball.y -= ball.vy;
		else 
			ball.y += ball.vy;

		if(my.left){
			my.x -= 5;
		}
		if(my.right){
			my.x += 5;
		}

		if(you.left){
			you.x -= 5;
		}
		if(you.right){
			you.x += 5;
		}

		you.draw();
		my.draw();

		c.fontStyle = '#ddd';
		c.font = "40px Calibri";
		c.fillText(you.score,w/2-10,75);
		c.fillText(my.score,w/2-10,h-50);
		c.fill();
	}

	_io.on('loopStart'+$stateParams.room,function(data){
		if(data.start){
			loop = setInterval(init,30);
			_io.emit('loopRun',1);
		}
	});
});

#!/usr/bin/env node

'use strict';

process.title = 'jssip-fosdem-demo';

// Module requirements.
const JsSIP = require('jssip');
const NodeWebSocket = require('jssip-node-websocket');
const readline = require('readline');
const open = require('open');
const clear = require('clear');
const debug = require('debug')('fosdem-demo');
const error = require('debug')('fosdem-demo-error');

// Custom data.
const invitation = require('./config.js').invitation;
const localPeer = require('./config.js').username;
const socket_url = require('./config.js').socket_url;
const socket_options = require('./config.js').socket_options;
let config = require('./config.js').ua_config;

const appName = 'JsSIP cli app demo for FOSDEM 2017';
const tryit = 'https://fosdem.jssip.net';

debug('booting %s', appName);

// JsSIP user agent instance.
let ua;

// SIP peer name on the other end.
let remotePeer;

// Start User Agent.
(function ()
{
	let socket = new NodeWebSocket(socket_url ,socket_options);

	config.sockets.push(socket);

	try {
		ua = new JsSIP.UA(config);
		ua.start();
	} catch (e) {
		error(e.message);
	}

	ua.on('registered', () => {
		debug('registered');
	});

	ua.on('unregistered', () => {
		debug('unregistered');
	});
})();

// Message send function.
function sendMessage(text)
{
	ua.sendMessage(remotePeer, text, {
		'eventHandlers': {
			'failed': function(e){
				console.log('! message could not be deliveved: %s', e.response.reason_phrase);
			}
		}
	});
}

// New MESSAGE callback function.
// Defined explicitly because we unsubscribe from UA::on('newMessage') while not chatting.
function onMessage(e)
{
	if (e.originator === 'remote')
	{
		let content = e.request.body;

		// Call invitation received. Open the given URL with the browser.
		if (content.match(/invite-/) !== null)
		{
			open(content.substring(7));
		}
		else
		{
			console.log('... %s', content);
		}
	}
}

// Helper functions //

// Call. Send invitation to the other peer and open the browser.
function call() {
	console.log();
	console.log('-- calling \'%s\' --', remotePeer);
	console.log();

	// Send invitation link.
	sendMessage('invite-'+ invitation);

	// Open browser.
	open(tryit);
}

function isConnected()
{
	if (!ua.isConnected())
	{
		console.log('you are not connected to the Websocket server...');
		console.log();
		return false;
	}
	return true;
}

// Command line interface.
let rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

cli();

function cli()
{
	rl.question('> ', (answer) =>
	{
		switch (answer)
		{
			case 'h':
			case 'help':
			{
				clear();
				console.log();
				console.log('- chat       : establish a chat session with the remote peer');
				console.log('- call       : establish a call with the remote peer');
				console.log('- register   : register SIP UA');
				console.log('- unregister : unregister SIP UA');
				console.log('- peer       : set remote peer name');
				console.log('- info       : dump the local information');
				console.log('- quit       : stop the app');
				console.log();
				cli();
				break;
			}

			case 'info':
			{
				clear();
				console.log();
				console.log('- JsSIP version:         %s', JsSIP.version);
				console.log('- Websocket server:      %s', ua.transport.socket.url);
				console.log('- Local peer name:       %s', localPeer);
				console.log('- Remote peer name:      %s', remotePeer);
				console.log('- WebSocket connected:   %s', ua.isConnected());
				console.log('- User agent registered: %s', ua.isRegistered());
				console.log();
				cli();
				break;
			}

			case 'chat':
			{
				if (remotePeer === undefined)
				{
					console.log('remote peername is not set');
					cli();
					break;
				}

				if (!isConnected())
				{
					cli();
					break;
				}

				console.log();
				console.log('-- chat session with \'%s\' --', remotePeer);
				console.log();

				// Register new MESSAGE callback function
				ua.on('newMessage', onMessage);
				chat();
				break;
			}

			case 'call':
			{
				if (remotePeer === undefined)
				{
					console.log('remote peername is not set');
					cli();
					break;
				}

				if (!isConnected())
				{
					cli();
					break;
				}

				call();
				cli();
				break;
			}

		  case 'register':
			{
				if (!isConnected())
				{
					cli();
					break;
				}

				ua.register();
				cli();
				break;
			}

		  case 'unregister':
			{
				if (!isConnected())
				{
					cli();
					break;
				}

				ua.unregister();
				cli();
				break;
			}

			case 'peer':
			{
				rl.question('type remote peer name: ', (peer) =>
				{
					if (peer)
						{
							remotePeer = peer;
							console.log('remote peer set to \'%s\'', remotePeer);
						}
						else {
							console.log('empty peer name entered');
						}
						cli();
				});
				break;
			}

			case 'quit':
			{
				rl.close();
				process.exit();
				break;
			}

			case '':
			{
				cli();
				break;
			}

			default:
			{
				console.log('no command named: %s', answer);
				cli();
				break;
			}
		}
	});
}

function chat()
{
	rl.question('', (text) =>
	{
		switch (text)
		{
			case 'h':
			case 'help':
			{
				console.log('- $content    : content to be sent to the remote peer');
				console.log('- call        : establish a call with the remote peer');
				console.log('- quit        : go back to command line');
				console.log();
				chat();
				break;
			}

			// Ignore empty input
			case '':
			{
				chat();
				break;
			}

			case 'call':
			{
				if (!isConnected())
				{
					chat();
					break;
				}

				call();
				chat();
				break;
			}

			case 'quit':
			{
				// Unregister new MESSAGE callback function
				ua.removeListener('newMessage', onMessage);

				console.log();
				console.log('-- end of chat session with \'%s\' --', remotePeer);
				console.log();
				cli();
				break;
			}

			default:
			{
				if (!isConnected())
				{
					chat();
					break;
				}

				sendMessage(text);
				chat();
				break;
			}
		}
	});
}

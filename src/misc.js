//https://github.com/hack-chat/main/pull/184
//select "chatinput" on "/"
document.addEventListener("keydown", e => {
	if (e.key === '/' && document.getElementById("chatinput") != document.activeElement) {
		e.preventDefault();
		document.getElementById("chatinput").focus();
	}
});

//make frontpage have a getter
//https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/get#%E4%BD%BF%E7%94%A8defineproperty%E5%9C%A8%E7%8E%B0%E6%9C%89%E5%AF%B9%E8%B1%A1%E4%B8%8A%E5%AE%9A%E4%B9%89_getter
function getHomepage() {
  
	ws = new WebSocket( ws_url );
  
	ws.onerror = function () {
	  pushMessage({ text: "# dx_xb\n连接聊天室服务器失败，请稍候重试。\n**如果这个问题持续出现，请立刻联系 mail@henrize.kim 感谢您的理解和支持**", nick: '!'});
	}
  
	var reqSent = false;
  
	ws.onopen = function () {
	  if (!reqSent) {
		send({ cmd: 'getinfo' });
		reqSent = true;
	  }
	  return;
	}
  
	ws.onmessage = function (message) {
	  var args = JSON.parse(message.data);
	  if (args.ver == undefined) {
		args.ver = "获取失败";
		args.online = "获取失败";
	  }
	  var homeText = "# 十字街\n##### " + args.ver + " 在线人数：" + args.online + " 客户端：CrosSt++ " + CSCPP_VER + "\n-----\n欢迎来到十字街，这是一个简洁轻小的聊天室网站。\n第一次来十字街？来 **[公共聊天室](?公共聊天室)** 看看吧！\n你也可以创建自己的聊天室。\n站长邮箱：mail@henrize.kim（维护中，无法发信）\n十字街源码：[github.com/CrosSt-Chat/CSC-main](https://github.com/CrosSt-Chat/CSC-main/)\n-----\n在使用本网站时，您应当遵守中华人民共和国的有关规定。\n如果您不在中国大陆范围内居住，您还应当同时遵守当地的法律规定。\nCrosSt.Chat Dev Team - 2020/02/29\nHave a nice chat!";    pushMessage({ text: homeText });
	}
  }


var info = {}

var channels = [
	[`?your-channel`, `?programming`, `?lounge`],
	[`?meta`, `?math`, `?physics`, `?chemistry`],
	[`?technology`, `?games`, `?banana`],
	[`?test`, `?your-channell`, `?china`, `?chinese`, `?kt1j8rpc`],
]

function pushFrontPage() {
	pushMessage({ text: frontpage() }, { isHtml: true, i18n: false, noFold: true })
}

/* ---Some variables to be used--- */

var myNick = localStorageGet('my-nick') || '';
var myColor = localStorageGet('my-color') || null;//hex color value for autocolor
var myChannel = decodeURIComponent(window.location.search.replace(/^\?/, ''))

var lastSent = [""];
var lastSentPos = 0;

var kolorful = false
var devMode = false

//message log
var jsonLog = '';
var readableLog = '';

var templateStr = '';

var replacement = '\*\*'
var hide = ''
var replace = ''

var lastcid;

var seconds = {
	'join': {
		'times': [],
		'last': (new Date).getTime(),
	},
}

var lastMentioned = ''


function reply(args) {//from crosst.chat
	let replyText = '';
	let originalText = args.text;
	let overlongText = false;

	// Cut overlong text
	if (originalText.length > 350) {
		replyText = originalText.slice(0, 350);
		overlongText = true;
	}

	// Add nickname
	if (args.trip) {
		replyText = '>' + args.trip + ' ' + args.nick + '：\n';
	} else {
		replyText = '>' + args.nick + '：\n';
	}

	// Split text by line
	originalText = originalText.split('\n');

	// Cut overlong lines
	if (originalText.length >= 8) {
		originalText = originalText.slice(0, 8);
		overlongText = true;
	}

	for (let replyLine of originalText) {
		// Cut third replied text
		if (!replyLine.startsWith('>>')) {
			replyText += '>' + replyLine + '\n';
		}
	}

	// Add elipsis if text is cutted
	if (overlongText) {
		replyText += '>……\n';
	}
	replyText += '\n';


	// Add mention when reply to others
	if (args.nick != myNick.split('#')[0]) {
		var nick = args.nick
		let at = '@'
		if ($id('soft-mention').checked) { at += ' ' }
		replyText += at + nick + ' ';
	}

	// Insert reply text
	replyText += input.value;

	input.value = '';
	insertAtCursor(replyText);
	input.focus();
}

/* ---Session Command--- */

function getInfo() {
	return new Promise(function (resolve, reject) {
		let ws = new WebSocket(ws_url);

		ws.onopen = function () {
			this.send(JSON.stringify({ cmd: "session", isBot: false }))
		}

		ws.onmessage = function (message) {
			let data = JSON.parse(message.data)
			if (data.cmd != 'session') {
				return
			}
			info.public = data.public
			info.chans = data.chans
			info.users = data.users
			if (should_get_info) {
				for (let i = 0; i < channels.length; i++) {
					let line = channels[i]
					for (let j = 0; j < line.length; j++) {
						let channel = line[j]
						let user_count = info.public[channel.slice(1)]
						if (typeof user_count == 'number') {
							channel = channel + ' ' + '(' + user_count + ')'
						} else {
							channel = channel + ' ' + '(\\\\)'
						}
						line[j] = channel
					}
					channels[i] = line
				}
			}
			this.close()
			resolve()
		}
	})
}

/* ---Window and input field and sidebar stuffs--- */

var windowActive = true;
var unread = 0;

window.onfocus = function () {
	windowActive = true;

	updateTitle();
}

window.onblur = function () {
	windowActive = false;
}

window.onscroll = function () {
	if (isAtBottom()) {
		updateTitle();
	}
}

function isAtBottom() {
	return (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 1);
}

function updateTitle() {
	if (myChannel == '') {
		unread = 0;
		return;
	}

	if (windowActive && isAtBottom()) {
		unread = 0;
	}

	var title;
	if (myChannel) {
		title = myChannel + " - crosst.chat++";
	} else {
		title = "crosst.chat++";
	}

	if (unread > 0) {
		title = '(' + unread + ') ' + title;
	}

	document.title = title;
}

$id('footer').onclick = function () {
	input.focus();
}

var keyActions = {
	send() {
		if (!wasConnected) {
			pushMessage({ nick: '*', text: "Attempting to reconnect. . ." })
			join(myChannel);
		}

		// Submit message
		if (input.value != '') {
			let text = input.value
			if ($id('auto-precaution').checked && checkLong(text) && (!text.startsWith('/') || text.startsWith('/me') || text.startsWith('//'))) {
				send({ cmd: 'emote', text: 'Warning: Long message after 3 second | 警告：3秒后将发送长消息' })
				sendInputContent(3000)
			} else {
				sendInputContent()
			}
		}
	},

	up() {
		if (lastSentPos == 0) {
			lastSent[0] = input.value;
		}

		lastSentPos += 1;
		input.value = lastSent[lastSentPos];
		input.selectionStart = input.selectionEnd = input.value.length;

		updateInputSize();
	},

	down() {
		lastSentPos -= 1;
		input.value = lastSent[lastSentPos];
		input.selectionStart = input.selectionEnd = 0;

		updateInputSize();
	},

	tab() {
		var pos = input.selectionStart || 0;
		var text = input.value;
		var index = text.lastIndexOf('@', pos);

		var autocompletedNick = false;

		if (index >= 1 && index == pos - 1 && text.slice(index - 1, pos).match(/^@@$/)) {
			autocompletedNick = true;
			backspaceAtCursor(1);
			insertAtCursor(onlineUsers.join(' @') + " ");
		} else if (index >= 0 && index == pos - 1) {
			autocompletedNick = true;
			if (lastMentioned.length > 0) {
				insertAtCursor(lastMentioned + " ");
			} else {
				insertAtCursor(myNick.split('#')[0] + " ");
				lastMentioned = myNick.split('#')[0]
			}
		} else if (index >= 0) {
			var stub = text.substring(index + 1, pos);

			// Search for nick beginning with stub
			var nicks = onlineUsers.filter(nick => nick.indexOf(stub) == 0);

			if (nicks.length == 0) {
				nicks = onlineUsers.filter(
					nick => nick.toLowerCase().indexOf(stub.toLowerCase()) == 0
				)
			}

			if (nicks.length > 0) {
				autocompletedNick = true;
				if (nicks.length == 1) {
					backspaceAtCursor(stub.length);
					insertAtCursor(nicks[0] + " ");
					lastMentioned = nicks[0]
				}
			}
		}

		// Since we did not insert a nick, we insert a tab character
		if (!autocompletedNick) {
			insertAtCursor('\t');
		}
	},
}

input.onkeydown = function (e) {
	if (e.keyCode == 13 /* ENTER */ && !e.shiftKey) {
		e.preventDefault();

		keyActions.send();
	} else if (e.keyCode == 38 /* UP */) {
		// Restore previous sent messages
		if (input.selectionStart === 0 && lastSentPos < lastSent.length - 1) {
			e.preventDefault();

			keyActions.up();
		}
	} else if (e.keyCode == 40 /* DOWN */) {
		if (input.selectionStart === input.value.length && lastSentPos > 0) {
			e.preventDefault();

			keyActions.down();
		}
	} else if (e.keyCode == 27 /* ESC */) {
		e.preventDefault();

		// Clear input field
		input.value = "";
		lastSentPos = 0;
		lastSent[lastSentPos] = "";

		updateInputSize();
	} else if (e.keyCode == 9 /* TAB */) {
		// Tab complete nicknames starting with @

		if (e.ctrlKey) {
			// Skip autocompletion and tab insertion if user is pressing ctrl
			// ctrl-tab is used by browsers to cycle through tabs
			return;
		}
		e.preventDefault();

		keyActions.tab();
	}
}

function sendInputContent(delay) {
	let text = input.value;
	input.value = '';

	if (templateStr && !isAnsweringCaptcha) {
		if (templateStr.indexOf('%m') > -1) {
			text = templateStr.replace('%m', text);
		}
	}
	if (!delay) {
		silentSendText(text)
	} else {
		setTimeout(silentSendText, delay, text)
	}

	lastSent[0] = text;
	lastSent.unshift("");
	lastSentPos = 0;

	updateInputSize();
}

function silentSendText(text) {
	if (kolorful) {
		send({ cmd: 'changecolor', color: Math.floor(Math.random() * 0xffffff).toString(16).padEnd(6, "0") });
	}

	if (isAnsweringCaptcha && text != text.toUpperCase()) {
		text = text.toUpperCase();
		pushMessage({ nick: '*', text: 'Automatically converted into upper case by client.' });
	}

	if (purgatory) {
		send({ cmd: 'emote', text: text });
	} else {
		// Hook localCmds
		if(isSPCmd(text)){
			callSPcmd(text)
		}else{
			send({ cmd: 'chat', text: text });
		}
	}
	return text;
}

function updateInputSize() {
	var atBottom = isAtBottom();

	input.style.height = 0;
	input.style.height = input.scrollHeight + 'px';
	document.body.style.marginBottom = $id('footer').offsetHeight + 'px';

	if (atBottom) {
		window.scrollTo(0, document.body.scrollHeight);
	}
}

input.oninput = function () {
	updateInputSize();
}

/// <reference path="C:\Application\Hint\typings\jquery\jquery.d.ts" />

// TODO 减小代码冗余度, 提高可移植性
// AngularJS ?
// typescipt ?

// 在string原型链上添加全部添加
String.prototype.replaceAll = function (s1, s2) {
	　　return this.replace(new RegExp(s1, "gm"), s2);
};

buptnet = {};

// 0:未登录，1:已登录
buptnet.state = 3;
buptnet.state_last = 3;

// 对应登录状态的可利用数据,详情见定义后的说明
buptnet.state_data = {};

buptnet.userdata = [];
// manifest配置
buptnet.curManifest = {};

buptnet.env = {};

/**
 * 将字符串形式的JavaScript变量定义转成JSON数据
 * @param scriptStr 字符串形式的JavaScript变量定义，其中定义的var可不存在
 * @returns 返回Json格式的数据
 */
buptnet.Script2Json = function (scriptStr) {
	var retStr = [];

	scriptStr = scriptStr.replaceAll(';', '\n').replaceAll('\'', '\"');
	scriptStr = scriptStr.match(/.+/g);
	scriptStr.forEach(function (element) {
		retStr.push(element.replace(/([\w_]+)=(.*)/, "\"$1\":$2"));
	}, this);
	retStr = '{' + retStr.join() + '}';

	return JSON.parse(retStr);
}

/**
 * 充值的流量，返回单位 MB
 */
buptnet.GetExFlow = function () {
	var exFlow = buptnet.state_data['fee'];
	// exFlow/10000=元，一元一GB
	exFlow = parseInt(exFlow / 10000 * 1024 * 1024);
	return buptbase.ConvertFlow(exFlow);
}

/**
 * 已用流量，返回单位 MB
 */
buptnet.GetFlow = function () {
	var flow = buptnet.state_data['flow'];
	return buptbase.ConvertFlow(flow);
}

// 登录过程中禁止按钮
buptnet.btnwait = {}
buptnet.btnwait.btn = $('#btn-login');
buptnet.btnwait.stop = function () {
	buptnet.btnwait.btn.text('登录');
	buptnet.btnwait.btn.removeAttr('disabled');
}
buptnet.btnwait.start = function () {
	buptnet.btnwait.btn.text('ing...');
	buptnet.btnwait.btn.attr('disabled', 'disabled');
}

/**
 * 无动画的切换登录和登陆后的页面
 */
buptnet.ChangePage = function () {
	if (buptnet.state_last != buptnet.state) {

		if (buptnet.state == 1) {
			$('#login-panel').hide();
			$('#fun-panel').show();
			chrome.browserAction.setIcon({ path: buptbase.paths.icon_on });
		} else {
			$('#login-panel').show();
			$('#fun-panel').hide();
			chrome.browserAction.setIcon({ path: buptbase.paths.icon_off });
		}
	}
	console.log('change');
}

/**
 * 获取一般情况下页面内嵌入的JavaScript变量
 * @param jqObj 返回的页面的化后的jQuery对象
 * @returns Json格式的html js嵌入变量
 */
buptnet.GetScriptData = function (jqObj) {
	// 获取页面内script参数
	var data = jqObj.filter('script').get(0).innerText;
	data = data.match(/\n.*\n/)[0];

	return buptnet.Script2Json(data);
}

/**
 * 检查是否为BUPT-portal环境
 */
buptnet.BUPT_portal_Check = function () {
	$.ajax({
		type: "GET",
		dataType: "html",
		url: buptbase.urls.portal_server,
		async: false,
		success: function (result) {
			console.log("in portal")
			$('#out-error').hide();
			$('#in-error').show();
		},
		error: function (data) {
			console.log("out portal")
			$('#in-error').hide();
			$('#out-error').show();
		}
	});

}

/**
 * BUPT-portal环境且未接入校园网时候自动登录首选账号
 */
buptnet.BUPT_portal_login = function () {
	var su = buptnet.GetSuperUser();
	if (su.username) {
		$.ajax({
			type: "POST",
			dataType: "html",
			url: buptbase.urls.portal_serverin,
			data: { 'user': su.username, 'pass': su.password },
			success: function (result) {
				console.log("in portal");
				// 装载首选用户并登陆
				buptnet.LoadLoginInfo();
				buptnet.Login();
				// 切换面板
				$('#error').hide();
				$('#fun-panel').show();
			},
			error: function (data) {
				console.log("out portal");
			}
		});
	} else {
		$('#inlogin-fail').show();
	}
}


/**
 * 连接不上校园网网关时候的处理
 */
buptnet.Ajaxfaild = function () {
	$('#login-panel').hide();
	$('#fun-panel').hide();
	// 尝试是否为BUPT-portal环境
	buptnet.BUPT_portal_Check();
	$('#error').show();
}

/**
 * 更新登录状态，获取状态数据，并完成相应动作
 */
buptnet.CheckNetStatus = function () {
	$.ajax({
		type: 'GET',
		dataType: "html",
		async: false,
		url: buptbase.urls.server + buptbase.urls.login_status,
		success: function (result, status) {
			// 获取页面标题判断账户状态
			result = $(result);
			var title = result.filter('title').get(0).innerText;
			buptnet.state_last = buptnet.state;

			if (title == "上网注销窗") {
				buptnet.state = 1;
				console.log("online");
			} else if (title == "欢迎登录北邮校园网络") {
				buptnet.state = 0;
				console.log("offline");
			}
			//获取响应页面参数
			buptnet.state_data = buptnet.GetScriptData(result);

			//切换页面
			buptnet.ChangePage();

			//关闭登录按键禁止状态
			buptnet.btnwait.stop();
		},
		error: function (data) {
			buptnet.Ajaxfaild();
			console.log('get state fail', data);
		}
	})
}

/**
 * 存储账号信息，已有账号记录情况下会覆盖密码
 * @param username 账号名字符串
 * @param passwd 密码字符串
 */
buptnet.AddUser = function (username, passwd) {
	var user = {};
	user = localStorage.getItem('user');
	if (user != null) {
		user = JSON.parse(user);
		user[username] = passwd;
		localStorage.setItem('user', JSON.stringify(user));
	} else {
		user = {};
		user[username] = passwd;
		localStorage.setItem('user', JSON.stringify(user));
		// 第一个存储用户为首用户
		localStorage.setItem('su', JSON.stringify(user));
	}
}

/**
 * 删除已存储的账号
 * @param username 账号名字符串
 */
buptnet.DelUser = function (username) {
	var user = {};
	user = localStorage.getItem('user');
	if (user != null) {
		user = JSON.parse(user);
		delete user[username];
		localStorage.setItem('user', JSON.stringify(user));
	} else {
		console.log('无用户数据')
	}
}

/**
 * 删除首选账号
 */
buptnet.DelSuperUser = function () {
	var super_user = {};
	localStorage.setItem('su', JSON.stringify(super_user));
};

/**
 * 获取首选账号
 */
buptnet.GetSuperUser = function () {
	var super_user = localStorage.getItem('su');
	var result = {};

	if (super_user !== null) {
		super_user = JSON.parse(super_user);
		var key;
		for (key in super_user)
			result.username = key;
		result.password = super_user[key];
	}

	return result;
};

/**
 * 设置首选账号
 * @param username 账号名字符串
 * @param passwd 密码字符串
 */
buptnet.SetSuperUser = function (username, passwd) {
	var user = {};
	user[username] = passwd;
	localStorage.setItem('su', JSON.stringify(user));
}

/**
 * 存储用户的设置
 * @param params 设置字典
 */
buptnet.SetSetting = function (params) {
	var setting = localStorage.getItem('setting');
	// 第一次运行，添加该项
	if (setting == null) {
		localStorage.setItem('setting', JSON.stringify({}));
		setting = { 'auto': false, 'listen': false, 'back': false };
	} else {
		setting = JSON.parse(setting);
	}
	for (var key in params) {
		setting[key] = params[key];
	}
	localStorage.setItem('setting', JSON.stringify(setting));
}

/**
 * 获取存储用户的设置
 * @return Json格式的设置字典，如不存在返回空
 */
buptnet.GetSetting = function () {
	var setting = localStorage.getItem('setting');
	if (setting != null) {
		setting = JSON.parse(setting);
	} else {
		setting = {};
	}
	return setting;
}

/**
 * 判断登录错误类型
 * @param errType 错误大类，数值
 * @param errInfo 具体错误，字符串
 * @return 错误字符串
 */
buptnet.LoginErrorInfo = function (errType, errInfo) {
	var err;
	switch (errType) {
		case 0:
		case 1:
			if ((errType == 1) && (errInfo != "")) {
				switch (errInfo) {
					case 'error0':
						err = "本IP不允许Web方式登录"; break;
					case 'error1':
						err = "本账号不允许Web方式登录"; break;
					case 'error2':
						err = "本账号不允许修改密码"; break;
					case 'ldap auth error':
						err = "密码错误"; break;
					default:
						err = errInfo; break;
				}
			}
			else err = "账号或密码不对";
			break;
		case 2: err = "该账号正在其他的机器上使用"; break;
		case 3: err = "本账号只能在指定地址使用"; break;
		case 4: err = "本账号费用超支或时长流量超过限制"; break;
		case 5: err = "本账号暂停使用"; break;
		case 6: err = "System buffer full"; break;
		case 8: err = "本账号正在使用,不能修改"; break;
		case 9: err = "新密码与确认新密码不匹配,不能修改"; break;
		case 10: err = "密码修改成功"; break;
		case 11: err = "本账号只能在指定地址使用"; break;
		case 7: err = "未名状态"; break;
		case 14: err = "注销成功"; break;
		case 15: err = "登录成功"; break;
	}
	return err;
}

/**
 * 刷新错误到页面上，无参数清除显示信息
 * @param msg 错误大类，数值
 * @param msga 具体错误，字符串
 */
buptnet.LoadLoginError = function (msg, msga) {
	var dispinfo = $('#login-fail')
	if (msg == undefined) {
		dispinfo.hide();
	} else {
		msg = parseInt(msg);
		dispinfo.text(buptnet.LoginErrorInfo(msg, msga));
		dispinfo.show();
	}
}

/**
 * 登录处理
 */
buptnet.Login = function () {
	var info = buptnet.GetLoginInfo();
	buptnet.btnwait.start();
	$.ajax({
		type: "POST",
		dataType: "html",
		url: buptbase.urls.server + buptbase.urls.login,
		//0MKKey也得提交
		data: { 'DDDDD': info.username, 'upass': info.passwd, 'savePWD': '0', '0MKKey': '' },
		success: function (result) {
			buptnet.CheckNetStatus();

			var rstr = result;
			//json 的 "Gno":04报错(登录成功情况下)
			result = result.replace('Gno=0', 'Gno=');
			// 获取页面标题判 断账户状态
			result = $(result);
			var title = result.filter('title').get(0).innerText;

			if (title == "信息返回窗") {
				// 登录失败，显示错误信息
				var msg = rstr.split('Msg=')[1].split(';')[0];
				var msga = rstr.split('msga=\'')[1].split('\'')[0];

				buptnet.LoadLoginError(msg, msga);
				console.log(msg, msga);
				return;
			} else {
				//登录成功，清除错误信息，如果有的话
				buptnet.LoadLoginError();
				var info = buptnet.GetScriptData($(result));
				localStorage.setItem('cuser', info['UID']);
			}

			//获得基础信息，已经check过不需要再次check更新
			buptnet.LoadBaseTab(false, false);
		},
		error: function (data) {
			buptnet.Ajaxfaild();
			console.log('login fail');
		}
	});
}

/**
 * 登出处理
 */
buptnet.Logoff = function () {
	$.get(buptbase.urls.server + buptbase.urls.logoff, function (result, status) {
		//回到登录页面从新装载数据
		buptnet.LoadLoginInfo();
		buptnet.LoadUserList();
		//更新状态
		buptnet.CheckNetStatus();
		console.log('logoff');
	}, "html")
}

/**
 * 获取登录界面的账号和密码并返回
 * @returns 账号密码
 */
buptnet.GetLoginInfo = function () {
	var info = {};
	info.username = $('#username').val();
	info.passwd = $('#passwd').val();
	return info;
}

/**
 * 设置登录界面的用户和密码
 * @param username 用户名字符串
 * @param passwd 密码字符串
 */
buptnet.SetLoginInfo = function (username, passwd) {
	//TODO 参数检查
	$('#username').val(username);
	$('#passwd').val(passwd);
}

/**
 * 从localStorage里装载首选用户信息，并填充到登录界面
 */
buptnet.LoadLoginInfo = function () {
	//TODO 参数检查
	var su = JSON.parse(localStorage.getItem('su'));
	if (su != null) {
		for (var key in su) {
			buptnet.SetLoginInfo(key, su[key]);
			console.log(key);
		}
	}
}

/**
 * 点击首选账号的回调处理函数
 */
buptnet.onSuperuser = function () {
	//TODO 判断是否成功登录后再记录
	var info = buptnet.GetLoginInfo();
	buptnet.SetSuperUser(info.username, info.passwd);
	buptnet.Login();
}

/**
 * 点击保存账号后的回调处理函数
 */
buptnet.onSaveLogin = function () {
	//TODO 判断是否成功登录后再记录
	var info = buptnet.GetLoginInfo();
	buptnet.AddUser(info.username, info.passwd);
	buptnet.Login();
}

/**
 * 点击删除账号的回调处理函数
 */
buptnet.onDelUser = function () {
	//TODO 判断是空
	var username = $("#user-list").find("option:selected").text();
	buptnet.DelUser(username);
	var super_user = buptnet.GetSuperUser();
	if (super_user.username === username) buptnet.DelSuperUser();
	buptnet.LoadUserList();
	buptnet.SetLoginInfo('', '');
}

/**
 * 从localStorage装载用户列表到登录界面的下拉列表
 */
buptnet.LoadUserList = function () {
	// TODO 没有登录才载入？
	var user = JSON.parse(localStorage.getItem('user'));
	var su = JSON.parse(localStorage.getItem('su'));
	var userlist = $('#user-list');
	var suname;
	// 先清除
	userlist.empty();
	//第一个为首选账号
	for (var key in su) {
		userlist.append("<option>" + key + "</option>")
		suname = key;
	}
	for (var key in user) {
		if (key != suname)
			userlist.append("<option>" + key + "</option>")
	}
}

/**
 * 绑定一些回调函数
 */
buptnet.BindButton = function () {
	$('#btn-login').click(buptnet.Login);
	$('#btn-logoff').click(buptnet.Logoff);

	$('#a-sulogin').click(buptnet.onSuperuser);
	$('#a-savelogin').click(buptnet.onSaveLogin);
	$('#a-deluser').click(buptnet.onDelUser);

	$("#user-list").change(function () {
		var username = $("#user-list").find("option:selected").text();
		var user = JSON.parse(localStorage.getItem('user'));

		var passwd = user[username];
		buptnet.SetLoginInfo(username, passwd);
	});

	$('#btn-refreshbase').click(function () {
		buptnet.LoadBaseTab(false, true);
	});

	$('#btn-cleardynamic').click(function () {
		buptchart.dynamic_set();
	});

	$("#limit-item").click(function (item) {
		var targetID = item.target.attributes.aim.value;
		var num = $("#limit-num").val();
		var target = $(targetID);

		// 确认是非负的数值, 且小于100 000
		if (parseInt(num) >= 0 && parseInt(num) <= 100000) {
			var rec = {}
			rec[targetID] = num;
			buptnet.SetSetting(rec);
			target.text(num);
			chrome.extension.getBackgroundPage().bkpage.RefreshSetting(true);
		} else {
			return;
		}
	});
	// 绑定，模态对话框
	$('#myModal').on('shown.bs.modal', function () { });
	//绑定portal下的一键登录
	$('#btn-inlogin').click(buptnet.BUPT_portal_login);
}

/**
 * 绑定设置界面下的switch事件
 */
buptnet.BindSwitch = function () {
	//全局switch设置
	$.fn.bootstrapSwitch.defaults.size = 'small';
	$.fn.bootstrapSwitch.defaults.onColor = 'success';

	$('#sw-auto').bootstrapSwitch({
		onSwitchChange: function (event, state) {
			buptnet.SetSetting({ 'auto': state });
		}
	});
	$('#sw-listen').bootstrapSwitch({
		onSwitchChange: function (event, state) {
			buptnet.SetSetting({ 'listen': state });
			chrome.extension.getBackgroundPage().bkpage.ListenCheck();
		}
	});
	$('#sw-back').bootstrapSwitch({
		onSwitchChange: function (event, state) {
			buptnet.SetSetting({ 'back': state });
			$('#limit-input').find("*").prop("disabled", !state);
		}
	});
}

/**
 * 从localStorage装载设置到设置界面
 */
buptnet.LoadSetting = function () {
	var setting = buptnet.GetSetting();
	$('#sw-auto').bootstrapSwitch(
		'state', setting['auto']
	);
	$('#sw-listen').bootstrapSwitch(
		'state', setting['listen']
	);
	$('#sw-back').bootstrapSwitch(
		'state', setting['back']
	);
	if (!setting['back']) {
		$('#limit-input').find("*").prop("disabled", true);
	}
	//载入数值设置
	for (var key in setting) {
		if (key[0] == '#') {
			$(key).text(setting[key]);
		}
	}
}

buptnet.dynamic_thandle = null;
buptnet.flow_last = 0;

/**
 * 流量图表的定时刷新回调
 */
buptnet.DynamicHandle = function () {
	buptnet.flow_last = buptnet.GetFlow();
	buptnet.CheckNetStatus();

	var x = (new Date()).getTime();
	//计算差值流量
	var y = buptnet.GetFlow() - buptnet.flow_last;
	buptchart.dynamic_set(x, y);
	console.log('timer');
}

/**
 * 设置流量图表的定时器
 * @param isStart true时候开启定时器，false关闭定时器
 */
buptnet.SetDynamic = function (isStart) {
	if (isStart && (buptnet.dynamic_thandle == null)) {
		buptchart.dynamic_set();
		buptnet.dynamic_thandle = setInterval(buptnet.DynamicHandle, buptchart.dynamic_interval);
		console.log('set timer');
	} else if (isStart == false) {
		clearInterval(buptnet.dynamic_thandle);
		buptnet.dynamic_thandle = null;
		console.log('clear timer');
	}
}

/**
 * 绑定标签页的事件函数
 */
buptnet.BindTab = function () {
	$('#fun-panel .nav-tabs>li>a').click(function (e) {
		e.preventDefault();
		$(this).tab('show');
		// 标签切换刷新数据
		var isStartTimer = false;
		var href = $(this).attr('href');
		if (href == '#tab-base') {
			buptnet.LoadBaseTab(false, true);
		} else if (href == '#tab-dynamic') {
			isStartTimer = true;
		} else if (href == '#tab-info') {
			buptnet.LoadInfoTab();
		} else if (href == "#tab-setting") {
			buptnet.LoadSetting();
		} else if (href == "#tab-about") {
			buptnet.LoadAbout();
		}

		buptnet.SetDynamic(isStartTimer);
		console.log('tab change');
	})
}

/**
 * 装载基础/高级信息页面的数据
 * @param isEx false时基本页面，true时信息页面(部分
 * @param isCheck 是否更新流量值
 */
buptnet.LoadBaseTab = function (isEx, isCheck) {
	var remain, cost;

	if (isCheck == true)
		buptnet.CheckNetStatus();
	var flow = buptnet.GetFlow();
	var exFlow = buptnet.GetExFlow();
	$('.base-remain').text(buptnet.state_data['fee'] / 10000 + ' 元');
	$('.base-time').text(buptnet.state_data['time'] + ' min');

	var now = buptbase.getMyTime();
	if (flow > buptchart.free_flow) {
		remain = exFlow;
		cost = ((flow - buptchart.free_flow) / 1024).toFixed(2);
	} else {
		remain = buptchart.free_flow - flow + exFlow;
		cost = 0;
	}

	// 高级信息
	if (isEx == true) {
		$('.info-used').text(flow + ' MB');
		$('.info-remain').text(remain + ' MB');
		$('.info-cost').text(cost + ' 元');
		$('.info-onlinerate').text((buptnet.state_data['time'] * 100.0 / now.minuteSpend).toFixed(4) + ' %');
	} else {
		buptchart.FlowSet(flow, exFlow);
	}

	var history = parseInt(flow / now.daysNow);

	flow = parseInt(remain / now.daysLeft);

	$('.base-history').text(history + ' MB/天');
	$('.base-advice').text(flow + ' MB/天');
}

/**
 * 装载高级信息页面的数据
 */
buptnet.LoadInfoTab = function () {
	// 刷新流量值
	buptnet.LoadBaseTab(true, true);

	$('.info-username').text(localStorage.getItem('cuser'));
	$.get(buptbase.urls.testip, function (result, status) {
		var ipv4 = result.split('= ')[1].replace(';', '');
		ipv4 = JSON.parse(ipv4);
		$('.info-eipv4').text(ipv4['cip']);
	}, "text");
	$.get(buptbase.urls.server + buptbase.urls.login, function (result, status) {
		var info = buptnet.GetScriptData($(result))
		$('.info-iipv4').text(info['v46ip']);
		info = info['v6'].replace('[', '').replace(']', '');
		$('.info-ipv6').text(info);
	}, "text")
}

/**
 * 装载关于页面的数据
 */
buptnet.LoadAbout = function () {
	$('#version').text(buptnet.curManifest.version);
	$('#use-env').text(buptnet.env.os + "  " + buptnet.env.browser + "  " + buptnet.env.ver);
}

/**
 * 一些初始化
 */
buptnet.Init = function () {
	// badge 背景色
	chrome.browserAction.setBadgeBackgroundColor({ color: [0, 0, 0, 0] })
	// 提示工具
	$("[data-toggle='tooltip']").tooltip();
	// 获取插件manifest配置和运行环境
	buptnet.curManifest = chrome.runtime.getManifest();
	buptnet.env = buptbase.GetBrowserInfo();
	// firefox的bug, 点击popup时候背景色变透明
	chrome.browserAction.setBadgeBackgroundColor({ color: "#4688F5" });
}

document.addEventListener("DOMContentLoaded", OnLoad);

/**
 * 页面初始化，DOMContentLoaded事件的回调
 */
function OnLoad() {

	buptnet.Init();

	// 获取登录状态
	buptnet.CheckNetStatus();

	buptnet.BindButton();
	buptnet.BindTab();
	buptnet.BindSwitch();

	// 检查登录状态
	if (buptnet.state == 0) {
		console.log('load');
		buptnet.LoadLoginInfo();
		buptnet.LoadUserList();
	} else if (buptnet.state == 1) {
		buptnet.LoadBaseTab(false, false);
	}

}

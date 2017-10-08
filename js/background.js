/// <reference path="C:\Application\Hint\typings\jquery\jquery.d.ts" />

// 只有popup有实例时候才会有效
// var popups = chrome.extension.getViews({type: "popup"});

bkpage = {};

// 0:未登录，1:已登录
bkpage.state = 0;
// 当前流量
bkpage.flow = 0;
bkpage.flow_last = 0;
// 剩余流量
bkpage.flow_rem = 0;
// 流量超标和计划超标标志位
bkpage.isOverFlow = false;
bkpage.isOverDay = false;

bkpage.setting = {};

/**
 * 创建并弹出一个notifications
 * @param str 显示字符串的内容
 */
bkpage.MakeNotice = function (str) {
	chrome.notifications.create({
		"iconUrl": buptbase.paths.icon_on,
		"type": "basic",
		"title": "北邮校园网",
		"message": str
	});
}

/**
 * 获得设置
 * @returns 获得的Json格式设置
 */
bkpage.GetSetting = function () {
	var setting = localStorage.getItem('setting');
	if (setting != null) {
		setting = JSON.parse(setting);
	} else {
		setting = {};
	}
	return setting;
}
/**
 * 截取整形
 * @param mstr 需要提取的字符串
 * @param start 开始部分字符串
 * @param end 结束部分字符串
 * @returns 获取到的整形数
 */
bkpage.subInt = function (mstr, start, end) {
	mstr = mstr.substring(mstr.indexOf(start), mstr.indexOf(end));
	mstr = mstr.substring(mstr.indexOf("'") + 1, mstr.lastIndexOf("'"));
	return parseInt(mstr);
}

/**
 * 获取首选账号，与popup.js重复
 * @returns 获取到的首选账号，不存在返回空
 */
bkpage.GetSuperUser = function () {
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
}

/**
 * 尝试登录接入校园网(BUPT=poral)
 */
bkpage.TryPortal = function () {
	var su = bkpage.GetSuperUser();
	if (su.username) {
		$.ajax({
			type: "POST",
			dataType: "html",
			url: buptbase.urls.portal_serverin,
			data: { 'user': su.username, 'pass': su.password },
			success: function (result) {
				console.log("in portal");
				// 再一次尝试自动登录
				bkpage.GetNetStatus(true, undefined);
			},
			error: function (data) {
				console.log("out portal", data);
			}
		});
	} else {
		console.log("out portal");
	}
}

/**
 * buptnet.CheckNetStatus简化版，在打开浏览器的时候检查网络
 * @param isLogin 检测出来状态为未登录时，是否根据设置自动登录
 * @param hfunc 得到已登录时候的用户数据后的回调处理函数
 */
bkpage.GetNetStatus = function (isLogin, hfunc) {
	$.ajax({
		type: 'GET',
		dataType: "html",
		timeout: 10 * 1000,
		url: buptbase.urls.server + buptbase.urls.login_status,
		success: function (result, status) {
			// 获取页面标题判断账户状态
			var retstr = result;
			var title = buptbase.GetInner(retstr, '<title>');
			if (title == "上网注销窗") {
				chrome.browserAction.setIcon({ path: buptbase.paths.icon_on });
				bkpage.state = 1;
				bkpage.flow_last = bkpage.flow;
				//计算当前流量和剩余流量
				bkpage.flow = buptbase.ConvertFlow(bkpage.subInt(retstr, "flow='", ";fsele"));
				bkpage.flow_rem = bkpage.subInt(retstr, "fee='", ";xsele");
				bkpage.flow_rem = buptbase.ConvertFlow(bkpage.flow_rem / 10000 * 1024 * 1024) + 20 * 1024 - bkpage.flow;
			} else if (title == "欢迎登录北邮校园网络") {
				chrome.browserAction.setIcon({ path: buptbase.paths.icon_off });
				bkpage.state = 0;
				if (isLogin == true) {
					if (true == bkpage.setting['auto'] || true == bkpage.setting['listen']) {
						console.log("try auto login")
						bkpage.Login();
					}
				}
			} else if (title == "北京邮电大学无线网准入认证\n") {
				// portal时候的重定向
				chrome.browserAction.setIcon({ path: buptbase.paths.icon_off });
				bkpage.state = 0;
				if (isLogin == true) {
					if (true == bkpage.setting['auto'] || true == bkpage.setting['listen']) {
						console.log("try portal")
						bkpage.TryPortal();
					}
				}
			}
			// 在登录的情况下定时回调 hfunc
			if (hfunc != undefined && bkpage.state == 1) {
				hfunc();
			}
		},
		error: function (data) {
			console.log('get state fail', data);
		}
	})
}

/**
 * 登录首选账号
 */
bkpage.Login = function () {
	var info = bkpage.GetSuperUser();

	console.log(info.username);

	$.ajax({
		type: "POST",
		dataType: "html",
		url: buptbase.urls.server + buptbase.urls.login,
		//0MKKey也得提交
		data: { 'DDDDD': info.username, 'upass': info.password, 'savePWD': '0', '0MKKey': '' },
		success: function (result) {
			var title = buptbase.GetInner(result, '<title>');
			if (title == "登录成功窗") {
				bkpage.MakeNotice('自动登录成功\n登录账号:' + info.username);
				localStorage.setItem('cuser', info.username);
				chrome.browserAction.setIcon({ path: buptbase.paths.icon_on });
				// 自动登录成功第一次获取flow数据，到处调补bug，可以考虑一个好的结构来解决
				bkpage.GetNetStatus(false, bkpage.BackHandle);
			} else {
				bkpage.MakeNotice('自动登录失败\n没有设置首选账号或其账号密码错误');
			}
		},
		error: function (data) {
			console.log('auto-login fail');
		}
	});
}

/**
 * 设置后台后立即生效，的刷新设置
 * @param isNowBack 是否立即检查
 */
bkpage.RefreshSetting = function (isNowBack) {
	bkpage.setting = bkpage.GetSetting();
	bkpage.isOverFlow = false;
	bkpage.isOverDay = false;
	// 立即回调一次
	if (isNowBack == true && bkpage.setting['back'] == true) {
		bkpage.GetNetStatus(false, bkpage.BackHandle);
	}
}

/**
 * 后台检查回调处理函数
 */
bkpage.BackHandle = function () {
	var text;

	// TODO 充值情况
	if (bkpage.setting['#num-rem'] != 0 && bkpage.flow_rem < bkpage.setting['#num-rem']) {
		if (bkpage.isOverFlow == false) {
			bkpage.isOverFlow = true;
			bkpage.MakeNotice('剩余流量预警\n现余流量低于' + bkpage.setting['#num-rem'] + "MB");
		}
		text = (bkpage.flow_rem / 1024).toFixed(1);
		chrome.browserAction.setBadgeText({ text: text });
	} else {
		bkpage.isOverFlow = false;
		chrome.browserAction.setBadgeText({ text: '' });
	}
	// 时段流量预警，bkpage.flow_last==0为漏掉第一次记录流量
	if (bkpage.setting['#num-spe'] != 0
		&& (bkpage.flow - bkpage.flow_last) > bkpage.setting['#num-spe']
		&& bkpage.flow_last != 0) {
		text = (bkpage.flow - bkpage.flow_last).toFixed(3);
		text = "流量使用过快\n" + text + "MB > 设置值" + bkpage.setting['#num-spe'] + "MB";
		bkpage.MakeNotice(text);
	}
	// 计划流量预警
	if (bkpage.setting['#num-day'] != 0) {
		if (bkpage.isOverDay == false) {
			var now = buptbase.getMyTime();
			bkpage.isOverDay = true;
			if ((bkpage.setting['#num-day'] * now.daysNow) < bkpage.flow) {
				bkpage.MakeNotice("今日用量超出计划\n" + "计划每日用量:" + bkpage.setting['#num-day']);
			}
		}
	}

	console.log('Tic Toc');
}

/**
 * 为右键菜单添加“在BT中搜索”的功能项
 */
bkpage.ContextMenusInit = function () {
	var title = '使用BT搜索"%s"'; // 功能项标题
	var contexts = ['selection']; // 功能项出现的上下文
	// 功能项被点击后的处理函数
	var handler = function (obj) {
		var search = obj.selectionText;
		search = encodeURIComponent(search);
		var href = 'http://bt.byr.cn/torrents.php?secocat=&cat=&incldead=0&spstate=0&inclbookmarked=0&search='
			+ search + '&search_area=0&search_mode=0';
		var tabProperties = {
			url: href,
			active: true
		};

		chrome.tabs.create(tabProperties, function () {
			console.log('搜索 ' + search + ' 已跳转.');
		});
	};
	// 添加菜单项的相关设置
	var properties = {
		title: title,
		contexts: contexts,
		onclick: handler
	};

	// 在右键菜单中添加此功能项
	chrome.contextMenus.create(properties, function () {
		console.log('context menu item added');
	});
};

/**
 * 页面创建的监听回调
 */
bkpage.LoginListener = function (tabId, changeInfo, tab) {
	if (changeInfo.status == "complete") {
		rcc = tab;
		if (tab.title == "欢迎登录北邮校园网络" || tab.title == "北京邮电大学无线网准入认证") {
			// 不能直接login会与自动登录造成冲突导致两次登录最后下线的悲剧
			bkpage.GetNetStatus(true);
			console.log('listen login')
		}
	}
}

/**
 * 检查设置监听登录
 */
bkpage.ListenCheck = function () {
	bkpage.setting = bkpage.GetSetting();
	var isListening = chrome.tabs.onUpdated.hasListener(bkpage.LoginListener);
	if (bkpage.setting['listen'] == true && isListening == false) {
		//监听页面创建，检测校园网页面
		chrome.tabs.onUpdated.addListener(bkpage.LoginListener);
		console.log("listener add");
	} else if (bkpage.setting['listen'] == false && isListening == true) {
		// 移除监听
		chrome.tabs.onUpdated.removeListener(bkpage.LoginListener);
		console.log("listener remove");
	}
}

/**
 * 本js文件初始化
 */
bkpage.Init = function () {
	bkpage.RefreshSetting(false);

	// 背景js初始化时候（即第一次打开浏览器时候）检查当前登录状态
	// 并根据设置判断是否进行自动登录首选账号
	bkpage.GetNetStatus(true);
	// 监听功能检查
	bkpage.ListenCheck();
	//设置后台运行回调
	if (bkpage.setting['back'] == true) {
		// 第一次获取flow数据
		bkpage.GetNetStatus(false, bkpage.BackHandle);
		setInterval(bkpage.GetNetStatus, 15 * 60 * 1000, false, bkpage.BackHandle);
	}
	// 统一背景颜色
	chrome.browserAction.setBadgeBackgroundColor({ color: "#4688F5" });

	bkpage.ContextMenusInit();
}


bkpage.Init();

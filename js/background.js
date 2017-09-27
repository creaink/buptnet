/// <reference path="C:\Application\Hint\typings\jquery\jquery.d.ts" />

//只有popup有实例时候才会有效
// var popups = chrome.extension.getViews({type: "popup"});

buptbase.FitBrowser();

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
 */
bkpage.GetSetting = function(){
	var setting = localStorage.getItem('setting');
	if (setting != null){
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
 */
bkpage.subInt = function(mstr, start, end){
	mstr = mstr.substring(mstr.indexOf(start), mstr.indexOf(end));
	mstr = mstr.substring(mstr.indexOf("'")+1, mstr.lastIndexOf("'"));
	return parseInt(mstr);
}

/**
 * buptnet.CheckNetStatus简化版，在打开浏览器的时候检查网络
 * @param isLoad 未登录时是否根据设置自动登录
 * @param setting 当isload为true时候，用户配置
 */
bkpage.GetNetStatus = function (isLoad, hfunc){
	$.ajax({
		type : 'GET',
		dataType : "html",
		url: buptbase.urls.server + buptbase.urls.login_status,
		success : function (result, status) {
			// 获取页面标题判断账户状态
			var retstr = result;
			recc = retstr
			result = $(result);
			var title = result.filter('title').get(0).innerText;
			if (title == "上网注销窗"){
				chrome.browserAction.setIcon({path: buptbase.paths.icon_on});
				bkpage.state = 1;
				bkpage.flow_last = bkpage.flow;
				//计算当前流量和剩余流量
				bkpage.flow = buptbase.ConvertFlow(bkpage.subInt(retstr, "flow='", ";fsele"));
				bkpage.flow_rem = bkpage.subInt(retstr, "fee='", ";xsele");
				bkpage.flow_rem = buptbase.ConvertFlow(bkpage.flow_rem/10000*1024*1024) + 20*1024 - bkpage.flow;
			} else if (title == "欢迎登录北邮校园网络"){
				chrome.browserAction.setIcon({path: buptbase.paths.icon_off});
				bkpage.state = 0;
				if (isLoad == true){
					if (true == bkpage.setting['auto']){
						bkpage.Login();
					}
				}
			}
			// 再登录的情况下定时回调 hfunc
			if (hfunc != undefined && bkpage.state == 1){
				hfunc();
			}
		},
		error : function (data) {
			buptbase.log('get state fail');
		}
	})
}

/**
 * 登录首选账号
 */
bkpage.Login = function (){
	var info = {};

	var su = JSON.parse(localStorage.getItem('su'));
	if (su != null){
		for (var key in su){
			info.username = key;
			info.passwd = su[key];
			buptbase.log(key);
		}
	}
	$.ajax({
		type: "POST",
		dataType: "html",
		url: buptbase.urls.server + buptbase.urls.login,
		//0MKKey也得提交
		data: {'DDDDD':info.username,'upass':info.passwd, 'savePWD':'0','0MKKey':''},
		success : function (result) {

			result = $(result);
			var title = result.filter('title').get(0).innerText;

			if (title == "登录成功窗"){
				bkpage.MakeNotice('自动登录成功\n登录账号:'+info.username);
				localStorage.setItem('cuser', info.username);
				chrome.browserAction.setIcon({path: buptbase.paths.icon_on});
			} else{
				bkpage.MakeNotice('自动登录失败\n没有设置首选账号或其账号密码错误');
			}
		},
		error : function (data) {
			buptbase.log('auto-login fail');
		}
	});
}

/**
 * 刷新设置
 * @param isNowBack 是否立即检查
 */
bkpage.RefreshSetting = function(isNowBack){
	bkpage.setting = bkpage.GetSetting();
	bkpage.isOverFlow = false;
	bkpage.isOverDay = false;
	// 立即回调一次
	if (isNowBack == true && bkpage.setting['back'] == true){
		bkpage.GetNetStatus(false, bkpage.BackHandle);
	}
}

/**
 * 后台检查回调处理函数
 */
bkpage.BackHandle = function(){
	var text;

	// TODO 充值情况
	if (bkpage.setting['#num-rem'] != 0 && bkpage.flow_rem < bkpage.setting['#num-rem']){
		if (bkpage.isOverFlow == false){
			bkpage.isOverFlow = true;
			bkpage.MakeNotice('剩余流量预警\n现余流量低于' + bkpage.setting['#num-rem'] + "MB");
		}
		text = (bkpage.flow_rem/1024).toFixed(1);
		chrome.browserAction.setBadgeText({text:text});
	} else {
		bkpage.isOverFlow = false;
		chrome.browserAction.setBadgeText({text:''});		
	}
	// 时段流量预警
	if (bkpage.setting['#num-spe'] != 0
	&& (bkpage.flow - bkpage.flow_last) > bkpage.setting['#num-spe']){
		text = (bkpage.flow - bkpage.flow_last).toFixed(3);
		text = "流量使用过快\n" + text + "MB > 设置值" + bkpage.setting['#num-spe'] + "MB";
		bkpage.MakeNotice(text);
	}
	// 计划流量预警
	if (bkpage.setting['#num-day'] != 0){
		if (bkpage.isOverDay == false){
			var now = buptbase.getMyTime();
			bkpage.isOverDay = true;
			if (bkpage.setting['#num-day']*now.daysMonth < bkpage.flow_rem){
				bkpage.MakeNotice("今日用量超出计划\n" + "计划日用量:" + bkpage.setting['#num-day']);
			}
		}
	}

	buptbase.log('Tback');
}

/**
 * 为右键菜单添加“在BT中搜索”的功能项
 */
bkpage.ContextMenusInit = function() {
	var title = '使用BT搜索"%s"'; // 功能项标题
	var contexts = ['selection']; // 功能项出现的上下文
	// 功能项被点击后的处理函数
	var handler = function (obj) {
		var search = obj.selectionText;
		search = encodeURIComponent(search);
		var href = 'http://bt.byr.cn/torrents.php?secocat=&cat=&incldead=0&spstate=0&inclbookmarked=0&search=' + search + '&search_area=0&search_mode=0';
		var tabProperties = {
			url: href,
			active: true
		};

		chrome.tabs.create(tabProperties, function () {
			buptbase.log('搜索 ' + search + ' 已跳转.');
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
		buptbase.log('context menu item has been added.');
	});
};

/**
 * 本js文件初始化
 */
bkpage.Init = function(){
	bkpage.RefreshSetting(false);

	// 背景js初始化时候（即第一次打开浏览器时候）检查当前登录状态
	// 并根据设置判断是否进行自动登录首选账号
	bkpage.GetNetStatus(true);

	if (bkpage.setting['listen'] == true){

		//监听页面创建，检测校园网页面
        browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
			if (changeInfo.status == "complete"){
				// if (tab.url == 'http://10.3.8.211/' && tab.title == "欢迎登录北邮校园网络"){
				if (tab.url == buptbase.urls.server + '/'){
					buptbase.log('listen')
					alert('请使用buptnet插件');
				}
			}
		});
	}
	//设置后台运行回调
	if (bkpage.setting['back'] == true){
		bkpage.GetNetStatus(false, bkpage.BackHandle);
		setInterval(bkpage.GetNetStatus, 15*60*1000, false, bkpage.BackHandle);
	}

	chrome.browserAction.setBadgeBackgroundColor({color:"#4688F5"});

	bkpage.ContextMenusInit();
}


bkpage.Init();

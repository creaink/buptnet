/// <reference path="C:\Application\Hint\typings\jquery\jquery.d.ts" />

//只有popup有实例时候才会有效
// var popups = chrome.extension.getViews({type: "popup"});

bkpage = {};

bkpage.MakeNotice = function (str) {
  var title = '北邮校园网';
  var body = {
	  	body: str,
		icon: '../icon/icon_on.png'};
  new Notification(title, body);
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
	return setting	
}

/**
 * buptnet.CheckNetStatus简化版，在打开浏览器的时候检查网络
 * @param isLoad 未登录时是否根据设置自动登录
 * @param setting 当isload为true时候，用户配置 
 */
bkpage.GetNetStatus = function (isLoad, setting){
	$.ajax({
		type : 'GET',
		dataType : "html",
		url : "http://10.3.8.211/1.htm", 
		success : function (result, status) {
			// 获取页面标题判断账户状态
			result = $(result);
			var title = result.filter('title').get(0).innerText;

			if (title == "上网注销窗"){
				chrome.browserAction.setIcon({path:"../icon/icon_on.png"})
			} else if (title == "欢迎登录北邮校园网络"){
				chrome.browserAction.setIcon({path:"../icon/icon_off.png"})

				if (isLoad == true){
					setting = bkpage.GetSetting();
					if (true == setting['auto']){
						bkpage.Login();
					}
				}
			}
		},
		error : function (data) {
			console.log('get state fail')
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
			console.log(key);
		}
	}
	$.ajax({
		type: "POST",
		dataType: "html",	
		url: "http://10.3.8.211//0.htm",
		//0MKKey也得提交
		data: {'DDDDD':info.username,'upass':info.passwd, 'savePWD':'0','0MKKey':''},
		success : function (result) {

			result = $(result);
			var title = result.filter('title').get(0).innerText;

			if (title == "登录成功窗"){
				bkpage.MakeNotice('自动登录成功\n登录账号:'+info.username);
				localStorage.setItem('cuser', info.username);
				chrome.browserAction.setIcon({path:"../icon/icon_on.png"})				
			} else{
				bkpage.MakeNotice('自动登录失败\n没有设置首选账号或其账号密码错误');				
			}
		},
		error : function (data) {
			console.log('auto-login fail')
		}
	});
}


bkpage.Init = function(){
	var setting = bkpage.GetSetting();

	// 背景js初始化时候（即第一次打开浏览器时候）检查当前登录状态
	// 并根据设置判断是否进行自动登录首选账号
	bkpage.GetNetStatus(true, setting);

	if (setting['listen'] == true){
		/**
		 * 监听页面创建，检测校园网页面
		 */
		chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
			if (changeInfo.status == "complete"){
				// if (tab.url == 'http://10.3.8.211/' && tab.title == "欢迎登录北邮校园网络"){
				if (tab.url == 'http://10.3.8.211/' && tab.title == "上网注销窗"){
					console.log('auto')
					setting = bkpage.GetSetting();
					if (true == setting['auto']){
						alert('请使用buptnet插件');
					}
				}
			}
		});
	}
}


bkpage.Init();

/// <reference path="C:\Application\Hint\typings\jquery\jquery.d.ts" />

buptbase = {};

// 浏览器不同命名空间兼容，全部转为chrome
buptbase.FitBrowser = function(){
	if (chrome.hasOwnProperty('tabs')) {
		browser = chrome;
	} else {
		chrome = browser;
	}
}

buptbase.paths = {};

buptbase.paths.icon_on = "../icon/icon_on.png";
buptbase.paths.icon_off = "../icon/icon_off.png";

buptbase.urls = {};
buptbase.urls.server = 'http://10.3.8.211'
//总是可以访问，返回的信息有ip
buptbase.urls.login = '/0.htm'
//根据状态返回登录或登录成功
buptbase.urls.login_status = '/1.htm'
//总是显示失败
buptbase.urls.logfail = '/2.htm'
//总是显示成功
buptbase.urls.logsuccess = '/3.htm'
//访问即注销
buptbase.urls.logoff = '/F.htm'
//外网ip查询api
buptbase.urls.testip = 'http://pv.sohu.com/cityjson?ie=utf-8'

// debug console输出开关
buptbase.debug = true;
buptbase.log = function(info){
	if (buptbase.debug)
		console.log(info)
}

/**
 * 获取本地json文件(也可网络请求最好异步)，同步请求
 * @param path json文件地址，相对于base.js的相对路径，如(../info.json)
 * @return json对象
 */
buptbase.FetchJsonFile = function(path){
	  var mReq = new XMLHttpRequest();
	  var data;
	  mReq.onload = function() {
		data = JSON.parse(this.responseText);
	  };
	  mReq.onerror = function() {
		buptbase.log('Fetch Error', path, err);
	  };
	  mReq.open('get', path, false);
	  mReq.send();

	  return data;
}
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
		console.log(info);
}

buptbase.error = function(info){
	console.error(info);
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

/** 
 * 将文本或者json变量生成下载链接
 * @param data 文本或者json变量
 * @param filename 下载保存的名字
 */
buptbase.SaveData = function(data, filename){
	if(!data) {
		buptbase.error('buptbase.save: No data');
		return;
	}

	if(!filename) filename = 'data.json';

	if(typeof data === "object"){
		data = JSON.stringify(data, undefined, 4);
	}

	var blob = new Blob([data], {type: 'text/json',endings:'native'}),
		e	= document.createEvent('MouseEvents'),
		a	= document.createElement('a');

	a.download = filename;
	a.href = window.URL.createObjectURL(blob);
	a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':');
	e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	a.dispatchEvent(e);
 };

/**
 * 获取浏览器及其版本
 * @return json对象
 */
 buptbase.GetBrowserInfo = function (){
	var br = {};
	var ua = navigator.userAgent.toLowerCase();
	if (!!window.StyleMedia) {
		var re =/(edge).*?([\d.]+)/;		
	} else {
		var re =/(firefox|chrome|opera|version).*?([\d.]+)/;
	}
    var m = ua.match(re);
    br.browser = m[1].replace(/version/, "'safari");
	br.ver = m[2];
	br.os = navigator.platform;
    return br;
}

// 计算十进制下的显示版本
buptbase.ConvertFlow = function(flow){
	if (flow != null){
		var flow0, flow1, flow3;
		flow0 = flow % 1024;
		flow1 = flow - flow0;
		flow0 = flow0 * 1000;
		flow0 = flow0 - flow0 % 1024;
		flow3 = '.';
		if (flow0 / 1024 < 10){
			flow3 = '.00';
		} else {
			if (flow0 / 1024 < 100) flow3 = '.0';
		}
		flow = flow1 / 1024 + flow3 + flow0 / 1024;
		return parseFloat(flow);
	}else{
		return 0;
	}
}

//计算一个月经历了多少分钟，返回值分钟
/**
 * 计算时间
 * @return JOSN格式数据，daysNow是第几号，minuteSpend当月经过时间
 * 			daysMonth一个月一共多少天，daysLeft当月剩余多少天
 */
buptbase.getMyTime = function() {
	var curDate = new Date();
	var t={};
	t.daysNow = curDate.getDate();
	t.minuteSpend = (t.daysNow-1)*24*60 + curDate.getHours()*60 + curDate.getMinutes();
	// 被当分母注意0值
	if (t.minuteSpend == 0){
		t.minuteSpend = 1;
	}
	/* 获取当前月份 */
	var curMonth = curDate.getMonth();
	/*  生成实际的月份: 由于curMonth会比实际月份小1, 故需加1 */
	curDate.setMonth(curMonth + 1);
	/* 将日期设置为0*/
	curDate.setDate(0);
	t.daysMonth = curDate.getDate();
	t.daysLeft = t.daysMonth - t.daysNow;

	// 被当分母注意0值
	if (t.daysLeft == 0){
		t.daysLeft = 1;
	}
	return t;
}

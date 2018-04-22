
buptbase = {};

/**
 * 浏览器不同命名空间兼容，全部转为chrome
 */
buptbase.FitBrowser = function () {
	if (chrome.hasOwnProperty('tabs')) {
		browser = chrome;
	} else {
		chrome = browser;
	}
}

// 加载本js时候运行以适配不同浏览器
try {
	buptbase.FitBrowser();
} catch (error) {
}

// debug console输出控制，注释下面的语句将会开启调试记录
// console.log = function() {}


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
buptbase.urls.testip = 'http://ip.taobao.com//service/getIpInfo.php?ip=myip'
//接入BUPT-portal时候的校园网网关，登录后即接入校园网
//但还需经过buptbase.urls.server才能访问外网
buptbase.urls.portal_server = 'http://10.3.8.214'
buptbase.urls.portal_serverin = 'http://10.3.8.214/login'

/**
 * 获取本地json文件(也可网络请求最好异步)，同步请求
 * @param path json文件地址，相对于base.js的相对路径，如(../info.json)
 * @return json对象
 */
buptbase.FetchJsonFile = function (path) {
	var mReq = new XMLHttpRequest();
	var data;
	mReq.onload = function () {
		data = JSON.parse(this.responseText);
	};
	mReq.onerror = function () {
		console.log('Fetch Error', path, err);
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
buptbase.SaveData = function (data, filename) {
	if (!data) {
		buptbase.error('buptbase.save: No data');
		return;
	}

	if (!filename) filename = 'data.json';

	if (typeof data === "object") {
		data = JSON.stringify(data, undefined, 4);
	}

	var blob = new Blob([data], { type: 'text/json', endings: 'native' }),
		e = document.createEvent('MouseEvents'),
		a = document.createElement('a');

	a.download = filename;
	a.href = window.URL.createObjectURL(blob);
	a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
	e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
	a.dispatchEvent(e);
};

/**
 * 获取浏览器及其版本
 * @return json对象
 */
buptbase.GetBrowserInfo = function () {
	var br = {};
	var ua = navigator.userAgent.toLowerCase();
	if (!!window.StyleMedia) {
		var re = /(edge).*?([\d.]+)/;
	} else {
		var re = /(firefox|chrome|opera|version).*?([\d.]+)/;
	}
	var m = ua.match(re);
	br.browser = m[1].replace(/version/, "'safari");
	br.ver = m[2];
	br.os = navigator.platform;
	return br;
}

/**
 * 计算十进制下的显示版本
 * @param flow 原始数据十进制下的存储版本
 */
buptbase.ConvertFlow = function (flow) {
	if (flow != null) {
		var flow0, flow1, flow3;
		flow0 = flow % 1024;
		flow1 = flow - flow0;
		flow0 = flow0 * 1000;
		flow0 = flow0 - flow0 % 1024;
		flow3 = '.';
		if (flow0 / 1024 < 10) {
			flow3 = '.00';
		} else {
			if (flow0 / 1024 < 100) flow3 = '.0';
		}
		flow = flow1 / 1024 + flow3 + flow0 / 1024;
		return parseFloat(flow);
	} else {
		return 0;
	}
}

//计算一个月经历了多少分钟，返回值分钟
/**
 * 计算时间
 * @return JOSN格式数据，daysNow是第几号，minuteSpend当月经过时间
 * 			daysMonth一个月一共多少天，daysLeft当月剩余多少天（包括今天）
 */
buptbase.getMyTime = function () {
	var curDate = new Date();
	var t = {};
	t.daysNow = curDate.getDate();
	t.minuteSpend = (t.daysNow - 1) * 24 * 60 + curDate.getHours() * 60 + curDate.getMinutes();
	// 被当分母注意0值
	if (t.minuteSpend == 0) {
		t.minuteSpend = 1;
	}
	/* 获取当前月份，js月份从0开始 、日期从1开始*/
	var curMonth = curDate.getMonth() + 1;

	/* 如果不设置日期会根据月份去算日期，例：当前为3-31设置月份为4会变成5-1因为4月只有30天 */
	/* 即其操作是针对时间戳的时间差量加减，同理setDate，如date为0则月份倒退，日期为上月的最后一天 （上月天数）*/
	curDate.setMonth(curMonth, 0);
	t.daysMonth = curDate.getDate();
	t.daysLeft = t.daysMonth - t.daysNow + 1;

	return t;
}

/**
 * 处理截取返回字符串str中start和end中的内容，如果为标签则传入start即可
 * @param str 需要处理的字符串
 * @param start 开头字符串，可以与end重复
 * @param end 结束字符串，未传参默认当做<>补充/
 * @return 截取的中间字符串
 */
buptbase.GetInner = function (str, start, end) {
	var pos = 0;
	if (end == undefined) {
		var end = start.replace('<', '</');
	}
	if (end == start) {
		pos = str.indexOf(start);
		return str.substring(pos, str.indexOf(end, pos + 1)).replace(start, '');
	} else {
		return str.substring(str.indexOf(start), str.indexOf(end)).replace(start, '');
	}
}

buptbase.buptIpMap = {
	"8":"北邮 无线网",
	"101":"北邮 教一",
	"102":"北邮 教二",
	"103":"北邮 教三",
	"104":"北邮 教四",
	"105":"北邮 主楼",
	"106":"北邮 教六",
	"107":"北邮 明光楼",
	"108":"北邮 新科研楼",
	"109":"北邮 新科研楼",
	"110":"北邮 学十楼北地下室",
	"111":"北邮 教十一",
	"112":"北邮 教十二",
	"113":"北邮 教十三",
	"114":"北邮 教十四",
	"115":"北邮 教二十九",
	"201":"北邮 学一",
	"202":"北邮 学二",
	"203":"北邮 学三",
	"204":"北邮 学四",
	"205":"北邮 学五",
	"206":"北邮 学六",
	"207":"北邮 学七",
	"208":"北邮 学八",
	"209":"北邮 学九",
	"210":"北邮 学十",
	"211":"北邮 学十一",
	"212":"北邮 学十二",
	"213":"北邮 学十三",
	"214":"北邮 学十四",
	"215":"北邮 学二十九"};

buptbase.LocBuptIP = function (strIP) {
	return buptbase.buptIpMap[ strIP.split('.')[1] ]||'未收录';
}
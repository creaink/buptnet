/// <reference path="C:/Application/Hint/jquery/index.d.ts" />
/// <reference path="C:/Application/Hint/highcharts/index.d.ts" />

var hashurl = location.hash.replace('#','').split('/');
/**
 * 标签页的细微调整
 */
if (hashurl == 'tabpage'){
	var page = $('#container');
	// 标签页扩展页面
	page.css('width','100%');
	page.css('padding','20px 70px');
}


var buptchart = {};

// ********参数区********
// 月免费额度，单位MB
buptchart.free_flow = 20*1024;
// 动态流量监控更新间隔
buptchart.dynamic_interval = 5000;
// 最大显示点数
buptchart.dynamic_max = 10;
// ********参数区********

buptchart.flow = {}
/**
 * 基础页面流量占比图表初始化配置
 */
buptchart.flow_config = {
	chart: {
		type: 'pie',
	},
	plotOptions: {
		pie: {
			allowPointSelect: true,
			cursor: 'pointer',
			dataLabels: {
				enabled: true,
				format: '<b>{point.name}</b>:{point.percentage:.1f}%',
				style: {
					color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
				}
			},
		},
		series: {
			animation: true
		}
	},
	colors: [
		'#e45771',
		'#92c37e',
		'#31b0d5'
	],
	credits: { enabled: false },
	tooltip: {
		pointFormat: '大小:<b>{point.y:.3f} MB<br>占比:{point.percentage:.1f} %</b>'
	},
	title: {
		text: null,
		align: 'left',
		floating: true
	},
	legend: {
		enabled: true
	},
	exporting: {
		enabled: false
	},
	series: [{
		name: '免费流量',
		colorByPoint: true,
		data: []
	}]
};

buptchart.flow_chart = {};

/**
 * 设置流量占比图表数据
 * @param flow 已用流量
 * @param exFlow 充值流量
 */
buptchart.FlowSet = function (flow, exFlow) {

	buptchart.flow_config.series[0].data = [];
	if ($.isEmptyObject(buptchart.flow_chart)) {
		// 此方式直接输入ID名，不用#
		buptchart.flow_chart = new Highcharts.chart("chart-flow", buptchart.flow_config);
	}
	if (flow != undefined) {
		var free = 0;
		if (flow < 1024 * 20){
			free = 1024 * 20 - flow
		}
		var data = [{ 'name': '已用', 'y': flow }, 
					{ 'name': '额余', 'y': free }, 
					{ 'name': '钱余', 'y': exFlow }]
		buptchart.flow_chart.series[0].setData(data, true, true, true);
	}
}

/**
 * 清空动态图表数据
 */
buptchart.GetEmptyDynamicChart = function () {
	var data = [],
		time = (new Date()).getTime(), i;
	for (i = -buptchart.dynamic_max; i < 0; i += 1) {
		data.push({
			x: time + i * buptchart.dynamic_interval,
			y: 0
		});
	}
	return data;
}

buptchart.dynamic_current = 0;
buptchart.dynamic_chart = {};

/**
 * 动态流量图的配置
 */
buptchart.dynamic_connfig = {
	chart: {
		type: 'spline',
	},
	credits: { enabled: false },
	xAxis: {
		type: 'datetime',
		dateTimeLabelFormats: {
			second: '%M:%S'
		},
		tickPixelInterval: 35
	},
	yAxis: {
		title: {
			text: null
		},
		labels: {
			format: '{value:.1f}'
		},
		plotLines: [{
			value: 0,
			width: 1,
			color: '#808080'
		}]
	},
	tooltip: {
		formatter: function () {
			return '时间：' + Highcharts.dateFormat('%M:%S', this.x) +
				'<br/><b>' + Highcharts.numberFormat(this.y, 3) + ' MB</b>';
		}
	},
	title: {
		text: null
	},
	legend: {
		enabled: false
	},
	exporting: {
		enabled: false
	},
	global : {
    	useUTC : false
	},
	series: [{
		name: '数据',
		data: buptchart.GetEmptyDynamicChart()
	}]
};

/**
 * 激活最新数据点的的Tooltip
 */
buptchart.activeLastPointToolip = function(chart) {
    var points = chart.series[0].points;
    chart.tooltip.refresh(points[points.length -1]);
}

/**
 * 设置动态流量xy图表数据
 * @param x xy图的x，时间
 * @param y xy图的y，x时刻的流量
 */
buptchart.dynamic_set = function (x, y) {
	if ($.isEmptyObject(buptchart.dynamic_chart)) {
		buptchart.dynamic_chart = new Highcharts.Chart('chart-dynamic', buptchart.dynamic_connfig, function (chart) {
			// 双击流量曲线清除图表
            $(chart.container).dblclick(function(){
				buptchart.dynamic_set();
            });
		});
	}
	if (x != undefined && y != undefined) {
		//满足点数后开始滚动
		buptchart.dynamic_current++;
		var quene = true;
		if (buptchart.dynamic_current < buptchart.dynamic_max) {
			quene = false;
		}
		buptchart.dynamic_chart.series[0].addPoint([x, y], true, quene, true);
		buptchart.activeLastPointToolip(buptchart.dynamic_chart);
	} else {
		buptchart.dynamic_chart.series[0].setData(buptchart.GetEmptyDynamicChart());
	}
}

// $(function () {
// 	设置时区
// 	Highcharts.setOptions({
// 		global: {
// 			useUTC: false
// 		}
// 	});
// });
